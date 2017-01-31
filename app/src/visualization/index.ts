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
  focusNodes: string[]
  openGroups: string[]
  openGroupsAll: boolean
}

const emptyViewState: ViewState = {
  focusNodes: ["5", "39", "2"],
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

  constructor(collector: DataSource) {
    // this.viewState = viewState.startWith(emptyViewState)
    this.graph = collector.dataObs
      .scan<TypedGraph<any, any>>(this.next, new TypedGraph<GraphNode, GraphEdge>())
    // .combineLatest(this.viewState, this.filter)
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
}

export default class Visualizer {

  // TODO workaround for Rx.Subject's
  public focusNodes = new Rx.Subject<string[]>()
  public openGroups = new Rx.Subject<string[]>()

  public DOM: Rx.Observable<VNode>
  public get viewState(): Rx.Observable<ViewState> {
    return this.focusNodes.startWith([]).combineLatest(this.openGroups.startWith([]), (fn, og) => ({
      focusNodes: fn,
      openGroups: og,
      openGroupsAll: true,
    }))
  }

  private clicks: Rx.Observable<string>
  private grapher: Grapher
  private app: HTMLElement | VNode

  constructor(grapher: Grapher, dom?: HTMLElement, controls?: HTMLElement) {
    this.grapher = grapher
    this.app = dom

    let inp = grapher.graph
      .debounce(10)
      .combineLatest(this.viewState, (graph, state) => {
        let filtered = this.filter(graph, state)
        return ({
          graph: filtered,
          layout: layoutf(filtered, state.focusNodes),
          viewState: state,
        })
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

  private filter(graph: TypedGraph<GraphNode, GraphEdge>, viewState: ViewState): TypedGraph<GraphNode, GraphEdge> {
    return graph.filterNodes((id, node: GraphNode) => {
      let groups = node.labels.flatMap(l => l.groups || [])
      return viewState.openGroupsAll ||
        !groups ||
        groups.length === 0 ||
        (groups.slice(-1).find(g => viewState.openGroups.indexOf(`${g}`) >= 0) && true)
    })
  }

}

type In = Rx.Observable<({ layout: Layout, viewState: ViewState, graph: TypedGraph<GraphNode, GraphEdge> })>
type Out = { svg: Rx.Observable<VNode>, clicks: Rx.Observable<string> }
function graph$(inp: In): Out {
  let result = inp.map(data => {
    return graph(data.layout, data.viewState, data.graph)
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

const u = 100
const mu = u / 2

function spath(ps: { x: number, y: number }[]): string {
  return "M" + ps.map(({x, y}) => `${mu + mu * x} ${mu + mu * y}`).join(" L ")
}

function bpath(ps: { x: number, y: number }[]): string {
  let last = ps[ps.length - 1]
  return "M " + mapTuples(ps, (a, b) =>
    `${mu + mu * a.x} ${mu + mu * a.y} C ${mu * (1 + a.x)} ${mu * (1.5 + a.y)}, ${mu + mu * b.x} ${mu * (0.5 + b.y)}, `
  ).join("") + ` ${mu + mu * last.x} ${mu + mu * last.y}`
}

export function mapTuples<T, R>(list: T[], f: (a: T, b: T, anr: number, bnr: number) => R): R[] {
  let result = []
  for (let i = 1, ref = i - 1; i < list.length; i++ , ref++) {
    result.push(f(list[ref], list[i], ref, i))
  }
  return result
}

function graph(layout: Layout, viewState: ViewState, graph: TypedGraph<GraphNode, GraphEdge>): {
  svg: VNode, clicks: Rx.Observable<string>
} {
  console.log("Layout", layout)

  // Collect clicks in Subject
  let clicks = new Rx.Subject<string>()

  function edge(edge: { v: string, w: string, points: { x: number, y: number }[] }): VNode {
    let { v, w, points } = edge
    let labels = graph.edge(v, w).labels

    let isHigher = labels.map(_ => _.edge.label).map((_: any) => _.type).indexOf("higherOrderSubscription sink") >= 0

    return h("path", {
      attrs: {
        d: bpath(points),
        fill: "transparent",
        id: `${v}/${w}`,
        stroke: isHigher ? "rgba(200,0,0,0.1)" : "rgba(0,0,0,0.1)",
        "stroke-width": 10,
      },
      key: `${v}/${w}`,
      on: { click: () => console.log(v, w, labels) },
      style: {
        transition: "d 1s",
      },
    })
  }

  function circle(item: { id: string, x: number, y: number }): { svg: VNode[], html: VNode[] } {
    let node = graph.node(item.id)
    let labels = node.labels
    let methods = labels.map(nl => nl.label)
      .filter((label: any) => typeof label.kind !== "undefined" && label.kind === "observable")

    let text = methods.map((l: any) => `${l.method}(${l.args})`).join(", ") || node.name || item.id

    let shade = h("circle", {
      attrs: {
        cx: mu + mu * item.x,
        cy: mu + mu * item.y + 1,
        fill: "rgba(0,0,0,.3)",
        r: 5,
      },
      key: `circle-shade-${item.id}`,
      style: { transition: "all 1s" },
    })

    let circ = h("circle", {
      attrs: {
        cx: mu + mu * item.x,
        cy: mu + mu * item.y,
        fill: colorIndex(parseInt(item.id, 10)),
        id: `circle-${item.id}`,
        r: 5,
        stroke: "black",
        "stroke-width": viewState.focusNodes.indexOf(item.id) >= 0 ? 1 : 0,
      },
      key: `circle-${item.id}`,
      on: { click: (e: any) => clicks.onNext(item.id), mouseover: (e: any) => console.log(item.id, labels) },
      style: { transition: "all 1s" },
    })

    let svg = [/*shade, */circ]

    let html = h("div", {
      attrs: { class: "graph-label" },
      key: `overlay-${item.id}`,
      on: { click: (e: any) => clicks.onNext(item.id) },
      style: {
        left: `${mu + mu * item.x}px`,
        top: `${mu + mu * item.y}px`,
        transition: "all 1s",
      },
    }, [h("span", text)])

    return { html: [html], svg }
  }

  let ns = layout[0].nodes.map(circle)

  let elements = layout
    .flatMap((level, levelIndex) => level.edges.map(edge)).sort(vnodeSort)
    .concat(ns.flatMap(n => n.svg).sort(vnodeSort))

  // Calculate SVG bounds
  let xmax = layout
    .flatMap(level => level.nodes)
    .reduce((p: number, n: { x: number }) => Math.max(p, n.x), 0) as number
  let ymax = layout
    .flatMap(level => level.nodes)
    .reduce((p: number, n: { y: number }) => Math.max(p, n.y), 0) as number

  let svg = h("svg", {
    attrs: {
      id: "structure",
      version: "1.1",
      xmlns: "http://www.w3.org/2000/svg",
    },
    style: {
      height: (ymax + 2) * mu,
      left: 0,
      position: "absolute",
      top: 0,
      width: (xmax + 2) * mu,
    },
  }, elements.concat(defs()))

  let mask = h("div", {
    attrs: {
      id: "structure-mask",
    },
    style: {
      height: `${(ymax + 2) * mu}px`,
      position: "relative",
      width: `${(xmax + 2) * mu}px`,
    },
  }, [svg].concat(ns.flatMap(n => n.html)))

  return {
    svg: mask,
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
  h("filter", {
    attrs: { height: "200%", id: "dropshadow", width: "200%" },
  }, [
      h("feGaussianBlur", { attrs: { in: "SourceAlpha", stdDeviation: "2" } }),
      h("feOffset", { attrs: { dx: 0, dy: 0, result: "offsetblur" } }),
      h("feMerge", [
        h("feMergeNode"),
        h("feMergeNode", { attrs: { in: "SourceGraphic" } }),
      ]),
    ]),
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

function vnodeSort(vna: VNode, vnb: VNode): number {
  return vna.key.toString().localeCompare(vnb.key.toString())
}
