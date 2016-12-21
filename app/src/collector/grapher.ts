import "../utils"
import { ICallRecord } from "./callrecord"
import { RxFiddleEdge } from "./edge"
import { IEvent } from "./event"
import { lines, rankLongestPath, structureLayout, indexedBy } from "./graphutils"
import { AddEvent, AddObservable, AddStackFrame, AddSubscription, ICollector, instanceAddSubscription } from "./logger"
import { RxFiddleNode } from "./node"
import { Edge as GraphEdge, Graph, alg, json } from "graphlib"
import TypedGraph from "./typedgraph"
import * as snabbdom from "snabbdom"
import { VNode } from "snabbdom"
import * as _ from "lodash"
import "../utils"
import { StackFrame } from "../utils";
import "../object/extensions"

/* tslint:disable:no-var-requires */
const dagre = require("dagre")
// const ErrorStackParser = require("error-stack-parser")
/* tslint:enable:no-var-requires */

export interface RxCollector {
  wrapHigherOrder<T>(subject: Rx.Observable<any>, fn: Function): (arg: T) => T
  before(record: ICallRecord, parents?: ICallRecord[]): this
  after(record: ICallRecord): void
}

type Node = {
  frame: AddStackFrame
  observables: {
    observable: number,
    subscriptions: {
      subscription: number
    }[]
  }[]
}

export type LevelType = "code" | "observable" | "subscription"
export type Leveled<T> = {
  id: string
  level: LevelType
  payload: T
  hierarchicOrder: number[]
}

export type LayerCrossingEdge = {
  upper: LevelType
  lower: LevelType
}
export type ShadowEdge = {
  shadow: boolean
  count: number
}

export class Grapher {

  public edges: RxFiddleEdge[] = []
  public nodes: RxFiddleNode[] = []
  public g = new TypedGraph<RxFiddleNode,RxFiddleEdge>("g", { compound: true, multigraph: true })
  public dag = new TypedGraph<RxFiddleNode,RxFiddleEdge>("dag", { compound: true, multigraph: true })
  public combined = new TypedGraph<RxFiddleNode,undefined>("combined", { compound: true, multigraph: true })
  public metroLines: { [sink: number]: number[] } = {}
  public svgZoomInstance: { destroy(): void } | null = null
  private codePathGraph = new TypedGraph<Node,undefined>()

  public leveledGraph = new TypedGraph<Leveled<(StackFrame|AddObservable|AddSubscription)>, LayerCrossingEdge|ShadowEdge|undefined>()

  private collector: ICollector

  constructor(collector: ICollector) {
    this.g.setGraph({})
    this.collector = collector
    ;(window as any)["leveledGraph"] = this.leveledGraph
    ;(window as any)["json"] = json
  }

  public structureDag(): Graph {
    return this.g.filterEdges((_: GraphEdge, obj: RxFiddleEdge) => obj.type === "structure")
  }

  private incrementDown(from: number, to: number) {
    if(typeof from === "undefined" || typeof to === "undefined") { return }
    
    let edge: ShadowEdge = this.leveledGraph.edge(`${from}`, `${to}`) as ShadowEdge
    if(typeof edge === "undefined") {
      edge = { shadow: true, count: 0 }
      this.leveledGraph.setEdge(`${from}`, `${to}`, edge)
    }
    edge.count = typeof edge.count === "number" ? edge.count + 1 : 1 
  }

  public handleLogEntry(el: any) {

    //
    // StackFrame
    //

    if (el instanceof AddStackFrame) {
      this.leveledGraph.setNode(`${el.id}`, {
        id: `${el.id}`,
        level: "code",
        payload: el.stackframe,
        hierarchicOrder: [],
      })
      if(typeof el.parent !== "undefined") {
        let parent = this.collector.getStack(el.parent)
        this.handleLogEntry(parent)
        this.leveledGraph.setEdge(`${parent.id}`, `${el.id}`)
      }
    }

    //
    // Observable
    //
    
    if (el instanceof AddObservable) {
      if (typeof el.callParent !== "undefined") {
        // continue
      }
      let node = this.setNode(el.id, new RxFiddleNode(
        `${el.id}`, el.method || "",
        this.collector.getStack(el.stack) && this.collector.getStack(el.stack).stackframe
        // , this
      ))

      this.leveledGraph.setNode(`${el.id}`, {
        id: `${el.id}`,
        level: "observable",
        payload: el,
        hierarchicOrder: [el.stack]
      })
      if(typeof el.stack !== "undefined") {
        this.leveledGraph.setEdge(`${el.stack}`, `${el.id}`, {
          upper: "code",
          lower: "observable"
        })
      }

      node.addObservable(el)
      
      for (let p of el.parents.filter(_ => typeof _ !== "undefined")) {
        let edge = new RxFiddleEdge(
          this.nodes[p], this.nodes[el.id],
          "structure", {
            "marker-end": "url(#arrow)",
          }
        )
        this.setEdge(p, el.id, edge)
        this.leveledGraph.setEdge(`${p}`, `${el.id}`)

        let parent = this.collector.getObservable(p)
        if(typeof parent.stack !== "undefined" && typeof el.stack !== "undefined")
        this.incrementDown(parent.stack, el.stack)
      }

    }
    
    //
    // Subscription
    //
    
    if (instanceAddSubscription(el) && typeof this.nodes[(el as AddSubscription).observableId] !== "undefined") {
      let adds: AddSubscription = (el as AddSubscription)

      // subs-graph
      this.combined.setNode(`${adds.id}`, el)
      adds.sinks.forEach(s => this.combined.setEdge(`${adds.id}`, `${s}`))

      let node = this.nodes[adds.observableId]
      let from = adds.observableId
      node.addObserver(this.collector.getObservable(adds.observableId), adds)

      // add metro lines
      if (adds.sinks.length > 0) {
        this.metroLines[adds.id] = (this.metroLines[adds.sinks[0]] || [adds.sinks[0]]).concat([adds.id])
        delete this.metroLines[adds.sinks[0]]
      } else {
        this.metroLines[adds.id] = [adds.id]
      }
      
      this.leveledGraph.setNode(`${el.id}`, {
        id: `${el.id}`,
        level: "subscription",
        payload: el,
        hierarchicOrder: [
          this.collector.getObservable(adds.observableId).stack, 
          adds.observableId
        ],
      })
      this.leveledGraph.setEdge(`${adds.observableId}`, `${adds.id}`, {
        upper: "observable",
        lower: "subscription"
      })

      adds.sinks.forEach((sinkId) => {
        let to = this.collector.getSubscription(sinkId).observableId
        let toNode = this.nodes[this.collector.getSubscription(sinkId).observableId]
        
        if(!this.edgeExists(from, to)) {
          this.setEdge(to, from, new RxFiddleEdge(node, toNode, "subscription", {
            dashed: true,
            stroke: "blue",
            "marker-start": "url(#arrow-reverse)",
          }))
        } else {
          let existing = this.edge(from, to)
          existing.options.stroke = "purple"
          existing.options["marker-start"] = "url(#arrow-reverse)"
        }

        this.leveledGraph.setEdge(`${el.id}`, `${sinkId}`)
        this.incrementDown(adds.observableId, to)
      })

      // Dashed link
      if (typeof adds.scopeId !== "undefined") {
        let toId = (this.collector.getSubscription(adds.scopeId)).observableId
        let to = this.nodes[(this.collector.getSubscription(adds.scopeId)).observableId]
        this.setEdge(toId, from, new RxFiddleEdge(to, node, "higherorder", {
          dashed: true,
          "marker-end": "url(#arrow)"
        }))

        this.leveledGraph.setEdge(`${adds.scopeId}`, `${adds.id}`)
        this.incrementDown(toId, adds.observableId)
      }

    }

    //
    // Event
    //

    if (el instanceof AddEvent && typeof this.collector.getSubscription(el.subscription) !== "undefined") {
      let oid = (this.collector.getSubscription(el.subscription)).observableId
      if (typeof this.nodes[oid] === "undefined") { return }
      for (let row of this.nodes[oid].observers) {
        if ((row[1] as { id: number }).id === el.subscription) {
          row[2].push(el.event)
        }
      }
    }
  }

  private processed = 0

  public process(): number {
    this.g.graph().ranker = "tight-tree"
    let start = this.processed
    this.processed = this.collector.length

    for (let i = start; i < this.collector.length; i++) {
      let el = this.collector.getLog(i)
      this.handleLogEntry(el)
    }

    return this.collector.length - start
  }

  public descendants(graph: Graph, v: string): string[] {
    if (!alg.isAcyclic(graph)) {
      throw new Error("Only use this on acyclic graphs!")
    }
    let sc = graph.successors(v)
    return sc.concat(sc.flatMap(s => this.descendants(graph, s)))
  }

  public setNode(id: number, label: RxFiddleNode): RxFiddleNode {
    this.nodes[id] = label
    this.g.setNode(`${id}`, label)
    return label
  }

  public edgeExists(from: number, to: number) {
    return typeof this.g.edge(`${from}`, `${to}`) !== "undefined"
  }

  public setEdge(from: number, to: number, edge: RxFiddleEdge) {
    if (edge.type === "structure") {
      this.dag.setNode(from.toString(10), edge.from)
      this.dag.setNode(to.toString(10), edge.to)
      this.dag.setEdge(from.toString(10), to.toString(10), edge)
    }
    
    this.g.setEdge(`${from}`, `${to}`, edge)
    this.edges.push(edge)
  }

  public edge(from: number | GraphEdge, to?: number): RxFiddleEdge | undefined {
    let edge: RxFiddleEdge
    if (typeof from === "number") {
      edge = this.g.edge(`${from}`, `${to}`)
    } else {
      edge = this.g.edge(from)
    }
    return typeof edge !== "undefined" ? edge : undefined
  }

  public node(label: string | number): RxFiddleNode | undefined {
    return this.nodes[typeof label === "number" ? label : parseInt(label, 10)]
  }
}
