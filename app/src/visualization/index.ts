import { Edge as EdgeLabel, Message, NodeLabel } from "../collector/logger"
import TypedGraph from "../collector/typedgraph"
import { generateColors } from "../color"
import "../object/extensions"
import "../utils"
import layoutf from "./layout"
import * as Rx from "rx"
import { h, init as snabbdom_init } from "snabbdom"
import attrs_module from "snabbdom/modules/attributes"
import class_module from "snabbdom/modules/class"
import event_module from "snabbdom/modules/eventlisteners"
import style_module from "snabbdom/modules/style"
import { VNode } from "snabbdom/vnode"

const patch = snabbdom_init([class_module, attrs_module, style_module, event_module])

export interface DataSource {
  dataObs: Rx.Observable<Message>
}

export type ViewState = {
  focusNodes: number[]
  openGroups: number[]
  openGroupsAll: boolean
}

const emptyViewState: ViewState = {
  focusNodes: [5, 39, 2],
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

  public viewState: Rx.Observable<ViewState>
  public graph: Rx.Observable<TypedGraph<GraphNode, GraphEdge>>

  constructor(collector: DataSource, viewState: Rx.Observable<ViewState> = Rx.Observable.empty<ViewState>()) {
    this.viewState = viewState.startWith(emptyViewState)
    this.graph = collector.dataObs
      .scan<TypedGraph<any, any>>(this.next, new TypedGraph<GraphNode, GraphEdge>())
      .combineLatest(this.viewState, this.filter)
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

  public focusNodes = new Rx.Subject<string[]>()
  public DOM: Rx.Observable<VNode>

  private clicks: Rx.Observable<string>
  private grapher: Grapher
  private app: HTMLElement | VNode

  constructor(grapher: Grapher, dom?: HTMLElement, controls?: HTMLElement) {
    this.grapher = grapher
    this.app = dom

    // TODO workaround for Rx.Subject
    this.focusNodes = new Rx.Subject<string[]>()
    // let fn = this.grapher.viewState.map(vs => vs.focusNodes.map(n => `${n}`))

    let inp = grapher.graph
      .debounce(10)
      .combineLatest(this.focusNodes, (g, f) => {
        console.log("Rendering with", g, f)
        return ({ focusNodes: f, layout: layoutf(g, f) })
      })
    let { svg, clicks } = graph$(inp)

    this.DOM = svg
    this.clicks = clicks

    // new StructureGraph().renderMarbles(graph, choices)
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
  }

  public run() {
    this.DOM
      .do(v => console.log("render output", (window as any).v = v))
      .subscribe(d => this.app = patch(this.app, d))
    this.clicks
      .scan((list, n) => list.indexOf(n) >= 0 ? list.filter(i => i !== n) : list.concat([n]), [])
      .startWith([])
      .subscribe(this.focusNodes)
  }

  public attach(node: HTMLElement) {
    this.app = node
    this.step()
  }

  public step() {
    this.run()
  }

}

type In = Rx.Observable<({ layout: Layout, focusNodes: string[] })>
type Out = { svg: Rx.Observable<VNode>, clicks: Rx.Observable<string> }
function graph$(inp: In): Out {
  let result = inp.map(data => {
    return graph(data.layout, data.focusNodes)
  }).publish().refCount()

  return {
    clicks: result.flatMap(_ => _.clicks),
    svg: result.map(_ => _.svg),
  }
}

type Layout = {
  edges: { points: [{ x: number, y: number }], v: string, w: string }[],
  nodes: { id: string, x: number, y: number }[],
}[]

function graph(l: Layout, focusNodes: string[]): { svg: VNode, clicks: Rx.Observable<string> } {
  console.log("Rendering graph", focusNodes)
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
      fill: focusNodes.indexOf(item.id) >= 0 ? "black" : colorIndex(parseInt(item.id, 10)),
      r: 5,
    },
    on: {
      click: (e: any) => clicks.onNext(item.id),
    },
  })))

  let xmax = l
    .flatMap(level => level.nodes)
    .reduce((p: number, n: { x: number }) => Math.max(p, n.x), 0) as number

  let clicks = new Rx.Subject<string>()
  let svg = h("svg", {
    attrs: {
      id: "structure",
      style: `width: ${xmax * u}px; height: ${u * (0.5 + elements.length)}px`,
      version: "1.1",
      xmlns: "http://www.w3.org/2000/svg",
    },
  }, elements)

  return {
    svg,
    clicks,
  }
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
