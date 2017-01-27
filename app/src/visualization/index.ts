import StructureGraph from "./structureGraph"
import { generateColors } from "../color"
import "../object/extensions"
import "../utils"
import { StackFrame } from "../utils"
import { ICallRecord, ICallStart } from "../collector/callrecord"
import { RxFiddleEdge } from "../collector/edge"
import { IEvent } from "../collector/event"
import {
  LayouterOutput, Ranked,
  indexedBy, rankLongestPath, rankFromTopGraph, structureLayout,
  toDot,
} from "../collector/graphutils"
import { AddObservable, AddSubscription, ICollector } from "../collector/logger"
import { RxFiddleNode } from "../collector/node"
import TypedGraph from "../collector/typedgraph"
import { Graph, alg } from "graphlib"
import { VNode } from "snabbdom/vnode"
import * as Rx from "rx"
import { normalize, denormalize, DummyEdge } from "../layout/normalize"
import { ordering } from "../layout/ordering"
import { priorityLayout } from "../layout/priority"
import layoutf from "./layout"

const snabbdom = require('snabbdom');
const patch = snabbdom.init([ // Init patch function with chosen modules
  require('snabbdom/modules/class').default, // makes it easy to toggle classes
  require('snabbdom/modules/attributes').default, // for setting properties on DOM elements
  require('snabbdom/modules/style').default, // handles styling on elements with support for animations
  require('snabbdom/modules/eventlisteners').default, // attaches event listeners
]);
const h = require('snabbdom/h').default; // helper function for creating vnodes

import { Edge as EdgeLabel, Message, NodeLabel } from "../collector/logger"

export interface DataSource {
  dataObs: Rx.Observable<Message>
}

export type ViewState = {
  focusNodes: number[]
  openGroups: number[]
  openGroupsAll: boolean
}

const emptyViewState: ViewState = {
  focusNodes: [],
  openGroups: [],
  openGroupsAll: true,
}

export type GraphNode = {
  name: string
  labels: NodeLabel[]
}
export type GraphEdge = {
  labels: EdgeLabel[]
}

export class Grapher {

  public graph: Rx.Observable<TypedGraph<GraphNode, GraphEdge>>

  constructor(collector: DataSource, viewState: Rx.Observable<ViewState> = Rx.Observable.empty<ViewState>()) {
    this.graph = collector.dataObs
      .scan<TypedGraph<any, any>>(this.next, new TypedGraph<GraphNode, GraphEdge>())
      .combineLatest(viewState.startWith(emptyViewState), this.filter)
  }

  private next(graph: TypedGraph<GraphNode, GraphEdge>, event: Message) {
    switch (event.type) {

      case "node": graph.setNode(`${event.id}`, {
        labels: [],
        name: event.node.name,
      })
        break

      case "edge":
        let e: GraphEdge = graph.edge(`${event.edge.v}`, `${event.edge.w}`) || {
          labels: [],
        }
        e.labels.push(event)
        graph.setEdge(`${event.edge.v}`, `${event.edge.w}`, e)
        break

      case "label":
        graph.node(`${event.node}`).labels.push(event)
        break

      default: break
    }

    return graph
  }

  private filter(graph: TypedGraph<GraphNode, GraphEdge>, viewState: ViewState) {
    return graph.filterNodes((id, node: GraphNode) => {
      let groups = node.labels.flatMap(l => l.groups || [])
      return viewState.openGroupsAll ||
        !groups ||
        groups.length === 0 ||
        (groups.slice(-1).find(g => viewState.openGroups.indexOf(g) >= 0) && true)
    })
  }
}

export default class Visualizer {

  public DOM: Rx.Observable<VNode>

  private grapher: Grapher
  private app: HTMLElement

  constructor(grapher: Grapher, dom?: HTMLElement, controls?: HTMLElement) {
    this.grapher = grapher
    this.app = dom

    this.DOM = grapher.graph.debounce(10).map(graph => {
      let l = layoutf(graph)
      console.log(graph.toDot(), l)

      // let render: VNode[] = []
      // let marbles: VNode[] = []
      // sg.renderMarbles(graph, this.choices)
      // let app = h("app", [
      //   h("master", [svg(l)].concat(marbles)),
      //   h("detail", [
      //     h("svg", {
      //       attrs: {
      //         id: "svg",
      //         style: "width: 200px; height: 200px",
      //         version: "1.1",
      //         xmlns: "http://www.w3.org/2000/svg",
      //       },
      //     }, render.concat(defs())),
      //   ]),
      // ])
      // return app
      return svg(l)
    })
  }

  public run() {
    this.DOM.subscribe(d => patch(this.app, d))
  }

  public attach(node: HTMLElement) {
    this.app = node
    this.step()
  }

  public step() {
    // window.requestAnimationFrame(() => this.step())
    this.run()
  }

}

function svg(l: {
  edges: { points: [{ x: number, y: number }], v: string, w: string }[],
  nodes: { id: string, x: number, y: number }[],
}[]) {
  let u = 100
  let mu = u / 2
  let elements = l.flatMap((level, levelIndex) => {
    let edges = level.edges.map(({ v, w, points }) => {
      let path = points.map(({x, y}) => `${mu + mu * x} ${mu + mu * y}`).join(" L ")
      return h("path", {
        attrs: {
          d: `M${path}`,
          fill: "transparent",
          stroke: levelIndex === 0 ? "rgba(0,0,0,0.1)" : "gray",
          // "stroke-dasharray": 5,
          "stroke-width": levelIndex === 0 ? 10 : 2,
        },
        on: { mouseover: () => console.log(/*graph.edge(v, w)*/) },
      })
    })
    return edges
  }).concat(l[0].nodes.map(item => h("circle", {
    attrs: {
      cx: mu + mu * item.x,
      cy: mu + mu * item.y,
      fill: colorIndex(parseInt(item.id, 10)),
      r: 5,
    },
    on: {
      click: (e: any) => console.log(item.id),
    },
  })))

  let xmax = l
    .flatMap(level => level.nodes)
    .reduce((p: number, n: { x: number }) => Math.max(p, n.x), 0) as number

  console.log(elements)
  return h("svg", {
    attrs: {
      id: "structure",
      style: `width: ${xmax * u}px; height: ${u * (0.5 + elements.length)}px`,
      version: "1.1",
      xmlns: "http://www.w3.org/2000/svg",
    },
  }, elements)
}

const colors = generateColors(40)
function colorIndex(i: number) {
  if (typeof i === "undefined" || isNaN(i)) { return "transparent" }
  let [r, g, b] = colors[i % colors.length]
  return `rgb(${r},${g},${b})`
}
(window as any).colors = colors

const defs: () => VNode[] = () => [h("defs", [
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
