import "../utils"
import { ICallRecord } from "./callrecord"
import { RxFiddleEdge } from "./edge"
import { AddEvent, AddObservable, AddSubscription, ICollector, instanceAddSubscription } from "./logger"
import { RxFiddleNode } from "./node"
import { Edge as GraphEdge, Graph, alg } from "graphlib"
import * as snabbdom from "snabbdom"
import { VNode } from "snabbdom"

/* tslint:disable:no-var-requires */
const dagre = require("dagre")
const svgPanZoom = typeof window !== "undefined" ? require("svg-pan-zoom") : {}
const h = require("snabbdom/h")
const patch = snabbdom.init([
  require("snabbdom/modules/attributes"),
  require("snabbdom/modules/eventlisteners"),
])
// const ErrorStackParser = require("error-stack-parser")
/* tslint:enable:no-var-requires */

const defs: VNode[] = [h("defs", [
  h("marker", {
    attrs: {
      id: "arrow",
      markerHeight: 10,
      markerUnits: "strokeWidth",
      markerWidth: 10,
      orient: "auto",
      overflow: "visible",
      refx: 0, refy: 3,
    },
  }, [h("path", { attrs: { d: "M-4,-2 L-4,2 L0,0 z", fill: "inherit" } })]),
  h("marker", {
    attrs: {
      id: "arrow-reverse",
      markerHeight: 10,
      markerUnits: "strokeWidth",
      markerWidth: 10,
      orient: "auto",
      overflow: "visible",
      refx: 0, refy: 3,
    },
  }, [h("path", { attrs: { d: "M0,0 L4,2 L4,-2 z", fill: "blue" } })]),
])]

export const HASH = "__hash"
export const IGNORE = "__ignore"

export type MethodName = string

export interface RxCollector {
  wrapHigherOrder<T>(subject: Rx.Observable<any>, fn: Function): (arg: T) => T
  before(record: ICallRecord, parents?: ICallRecord[]): this
  after(record: ICallRecord): void
}

export class Visualizer {

  public edges: RxFiddleEdge[] = []
  public nodes: RxFiddleNode[] = []
  public g: Graph = new Graph({ compound: true, multigraph: true })
  public dag: Graph = new Graph({ compound: true, multigraph: true })
  public svgZoomInstance: { destroy(): void } | null = null

  private showIdsBacking = false
  public get showIds() {
    return this.showIdsBacking
  }
  public set showIds(value: boolean) {
    this.showIdsBacking = value
    this.run()
  }

  private svg: HTMLElement | VNode
  private rendered: number = 0
  private collector: ICollector

  constructor(collector: ICollector, dom?: HTMLElement) {
    this.g.setGraph({})
    this.svg = dom
    this.collector = collector

    if (!!window) {
      (<any>window).alg = alg;
      (<any>window).dagre = dagre
    }
  }

  public structureDag(): Graph {
    let edges: { v: string, w: string }[] = this.g.edges()
    let clone = new Graph()
    edges.forEach(({ v, w }) => {
      let edge = this.g.edge({ v, w })
      if (edge.type !== "structure") { return }
      console.log(edge, v, w)
      edge.from = this.g.node(v)
      edge.to = this.g.node(w)
      clone.setNode(v, this.g.node(v))
      clone.setNode(w, this.g.node(w))
      clone.setEdge(v, w, edge)
    })
    return <any>(clone) as Graph
  }

  public layout() {
    this.nodes.forEach(n => n.layout())
    dagre.layout(this.g)
  }

  public size(): { w: number, h: number } {
    if (this.nodes.length === 0) {
      return { h: 10, w: 10 }
    }
    let g = this.g.graph()
    this.layout()
    return { h: g.height, w: g.width }
  }

  public highlightSubscriptionSource(id?: number, level: number = 1) {
    let sub = this.collector.getSubscription(id)
    if (typeof sub !== "undefined") {
      if (level < 0.1) { return }
      sub.sinks.forEach(p => {
        this.highlightSubscriptionSource(p, level * 0.9)
        let parent = this.collector.getSubscription(p)
        let node = this.nodes[parent.observableId]
        if (node) { node.setHighlightId(patch, parent.id) }
      })
    } else {
      this.nodes.forEach(n => { n.setHighlightId(patch) })
    }
  }

  public process(): number {
    this.g.graph().ranker = "tight-tree"
    // this.g.graph().rankdir = "RL"
    let start = this.rendered
    this.rendered = this.collector.length

    for (let i = start; i < this.collector.length; i++) {
      let el = this.collector.getLog(i)

      if (el instanceof AddObservable) {
        if (typeof el.callParent !== "undefined") {
          // continue
        }
        let node = this.setNode(el.id, new RxFiddleNode(`${el.id}`, el.method, null, this))
        node.addObservable(el)
        for (let p of el.parents.filter(_ => typeof _ !== "undefined")) {
          // typeof this.nodes[p] === "undefined" && console.warn(p, "node is undefined, to", el.id)
          let edge = new RxFiddleEdge(
            this.nodes[p], this.nodes[el.id],
            "structure", {
              "marker-end": "url(#arrow)",
            }
          )
          this.setEdge(p, el.id, edge)
        }
      }

      if (instanceAddSubscription(el) && typeof this.nodes[(el as AddSubscription).observableId] !== "undefined") {
        let adds: AddSubscription = (el as AddSubscription)
        let node = this.nodes[adds.observableId]
        let from = adds.observableId
        node.addObserver(this.collector.getObservable(adds.observableId), adds)

        adds.sinks.forEach((parentId) => {
          let to = this.collector.getSubscription(parentId).observableId
          let toNode = this.nodes[this.collector.getSubscription(parentId).observableId]
          let existing = this.edge(from, to)

          if (typeof existing === "undefined") {
            this.setEdge(to, from, new RxFiddleEdge(node, toNode, "subscription", {
              dashed: true,
              stroke: "blue",
              "marker-start": "url(#arrow-reverse)",
            }))
          } else if (existing instanceof RxFiddleEdge) {
            existing.options.stroke = "purple"
            existing.options["marker-start"] = "url(#arrow-reverse)"
          } else {
            console.warn("What edge?", existing)
          }
        })

        // Dashed link
        if (typeof adds.scopeId !== "undefined") {
          let toId = (this.collector.getSubscription(adds.scopeId)).observableId
          let to = this.nodes[(this.collector.getSubscription(adds.scopeId)).observableId]
          this.setEdge(toId, from, new RxFiddleEdge(to, node, "higherorder", {
            dashed: true,
            "marker-end": "url(#arrow)",
          }))
        }
      }

      if (el instanceof AddEvent && typeof this.collector.getSubscription(el.subscription) !== "undefined") {
        let oid = (this.collector.getSubscription(el.subscription)).observableId
        if (typeof this.nodes[oid] === "undefined") { continue }
        for (let row of this.nodes[oid].observers) {
          if ((row[1] as { id: number }).id === el.subscription) {
            row[2].push(el.event)
          }
        }
      }
    }

    return this.collector.length - start
  }

  public render(): VNode {
    this.rendered = this.collector.length

    /* Prepare components */
    let comps = alg.components(this.dag as any)
    let graphs = comps.map(array => this.dag.filterNodes(n => array.indexOf(n) >= 0))
    console.log(graphs)

    this.layout()
    if (this.dag.nodes().length === 0) {
      return h("g")
    }

    let ns = this.dag.nodes().map((id: string) => this.node(id).render(patch, this.showIds))
      .reduce((p, c) => p.concat(c), [])
    let es = this.dag.edges().map((e) => {
      let edge = this.edge(e)
      return edge.render()
    })
    let childs = es.concat(ns)

    return h("g", { attrs: { class: "visualizer" } }, childs)
  }

  public run() {
    if (this.svg instanceof HTMLElement) {
      this.svg.innerHTML = ""
    }

    let changes = this.process()
    let render = this.render()
    this.size()
    let updated = h("svg", {
      attrs: {
        id: "svg",
        style: "width: 100vw; height: 100vh",
        version: "1.1",
        xmlns: "http://www.w3.org/2000/svg",
      },
    }, [render].concat(defs))
    patch(this.svg, updated)
    this.svg = updated
    if (this.svgZoomInstance && changes) {
      this.svgZoomInstance.destroy()
    }
    if (!this.svgZoomInstance || changes) {
      this.svgZoomInstance = svgPanZoom("#svg", { maxZoom: 30 })
    }
  }
  public attach(node: HTMLElement) {
    this.svg = node
    this.step()
  }
  public step() {
    window.requestAnimationFrame(() => this.step())
    if (this.rendered === this.collector.length) {
      return
    }
    this.run()
  }

  private setNode(id: number, label: RxFiddleNode): RxFiddleNode {
    this.nodes[id] = label
    this.g.setNode(`${id}`, label)
    return label
  }

  private setEdge(from: number, to: number, edge: RxFiddleEdge) {
    if (edge.type === "structure") {
      this.dag.setNode(`${from}`, this.nodes[from])
      this.dag.setNode(`${to}`, this.nodes[to])
      this.dag.setEdge(`${from}`, `${to}`, edge)
    }
    this.g.setEdge(`${from}`, `${to}`, edge)
    this.edges.push(edge)
  }

  private edge(from: number | GraphEdge, to?: number): RxFiddleEdge | undefined {
    let edge: RxFiddleEdge
    if (typeof from === "number") {
      edge = this.g.edge(`${from}`, `${to}`)
    } else {
      edge = this.g.edge(from)
    }
    return typeof edge !== "undefined" ? edge : undefined
  }

  private node(label: string | number): RxFiddleNode | undefined {
    return this.nodes[typeof label === "number" ? label : parseInt(label, 10)]
  }
}
