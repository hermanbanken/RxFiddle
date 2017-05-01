// tslint:disable:object-literal-sort-keys
import { jsonify } from "../../test/utils"
import { IEvent } from "../collector/event"
import TimeComposer from "../collector/timeComposer"
import TypedGraph from "../collector/typedgraph"
import { generateColors } from "../color"
import "../object/extensions"
import { IObservableTree, IObserverTree, ISchedulerInfo, ObservableTree, ObserverTree, SubjectTree } from "../oct/oct"
import "../utils"
import { Graphs, ViewState } from "./index"
import { MarbleCoordinator } from "./marbles"
import MorphModule from "./morph"
import slider from "./slider"
import {
  DiagramOperatorClick, DiagramOperatorHoover,
  HigherOrderClick, HigherOrderHoover,
  MarbleClick, MarbleHoover,
  UIEvent,
} from "./uievent"
import * as Rx from "rxjs"
import { h } from "snabbdom"
import { VNode } from "snabbdom/vnode"

export type Layout = {
  edges: { points: { x: number, y: number }[], v: string, w: string }[],
  nodes: { id: string, x: number, y: number }[],
}[]

export type In = Rx.Observable<({
  _sequence: number, layout: Layout, viewState: ViewState,
  graphs: Graphs, focusNodes: string[], hooverNodes: string[],
  time: TimeComposer,
})>
export type Out = {
  svg: Rx.Observable<VNode>,
  timeSlider: Rx.Observable<VNode>,
  clicks: Rx.Observable<string[]>,
  groupClicks: Rx.Observable<string>,
  tickSelection: Rx.Observable<number>,
  uievents: Rx.Observable<UIEvent>,
}

export function graph$(inp: In): Out {
  let result = inp.map(data => {
    return graph(data.layout, data.viewState, data.graphs, data._sequence, data.focusNodes, data.hooverNodes)
  }).share()

  return {
    clicks: result.flatMap(_ => _.clicks),
    groupClicks: result.flatMap(_ => _.groupClicks),
    svg: result.map(_ => _.svg),
    tickSelection: result.flatMap(_ => _.tickSelection),
    timeSlider: result.map(_ => _.timeSlider),
    uievents: result.flatMap(_ => _.uievents),
  }
}

const u = 100
const mx = u / 2
const my = u

export function mapTuples<T, R>(list: T[], f: (a: T, b: T, anr: number, bnr: number) => R): R[] {
  let result = []
  for (let i = 1, ref = i - 1; i < list.length; i++ , ref++) {
    result.push(f(list[ref], list[i], ref, i))
  }
  return result
}

function nodeLabel(node: IObservableTree | IObserverTree): (VNode | string)[] {
  if (node instanceof ObservableTree || node instanceof SubjectTree) {
    return name(node as IObservableTree)
  }
  if ((node instanceof ObservableTree || node instanceof SubjectTree) && node.calls) {
    let call = node.calls[node.calls.length - 1]
    return [`${call.method}(${call.args})`]
  }
  if (node && node.names) {
    return [node.names[node.names.length - 1]]
  }
  return [""]
}

function getObservable(
  observerNode: string,
  ...lookupGraphs: TypedGraph<IObservableTree | IObserverTree, {}>[]
): IObservableTree | undefined {
  return lookupGraphs.filter(g => g.hasNode(observerNode)).map(g => {
    // shortcut
    if (g.hasNode(observerNode) && typeof g.node(observerNode) === "object") {
      return (g.node(observerNode) as IObserverTree).observable
    }
    // long way round
    let inEs = g
      .inEdges(observerNode)
    if (!inEs) {
      console.warn("Observable for Observer(" + observerNode + ") not found")
      return undefined
    }
    let observable = inEs.map(e => g.node(e.v))
      .find(_ => !(_ instanceof ObserverTree))
    return observable as IObservableTree
  }).find(v => typeof v !== "undefined")
}

export type graphType = {
  svg: VNode, timeSlider: VNode,
  clicks: Rx.Observable<string[]>,
  groupClicks: Rx.Observable<string>,
  tickSelection: Rx.Observable<number>,
  uievents: Rx.Observable<UIEvent>
}

export function graph(
  layout: Layout, viewState: ViewState,
  graphs: Graphs, sequence: number,
  focusNodes: string[], hooverNodes: string[]
): graphType {
  let graph = graphs.main

  // Calculate SVG bounds
  let xmax = layout
    .flatMap(level => level.nodes)
    .reduce((p: number, n: { x: number }) => Math.max(p, n.x), 0) as number
  let ymax = layout
    .flatMap(level => level.nodes)
    .reduce((p: number, n: { y: number }) => Math.max(p, n.y), 0) as number

  let xPos = (x: number) => Math.min((2 + xmax) * mx, 400) - (mx + mx * x)
  let yPos = (y: number) => (my / 2 + my * y)

  // tslint:disable-next-line:no-unused-variable
  function spath(ps: { x: number, y: number }[]): string {
    return "M" + ps.map(({ x, y }) => `${xPos(x)} ${yPos(y)}`).join(" L ")
  }

  function bpath(ps: { x: number, y: number }[], higher: boolean = false): string {
    // simple:
    // return "M" + [ps[0], ps[1]].map((p) => `${mu + mu * p.x} ${mu + mu * p.y}`).join(" L ")
    let last = ps[ps.length - 1]
    if (higher) {
      return "M " + mapTuples(ps, (a, b, anr, bnr) =>
        ps.length - 1 !== bnr ?
          `${xPos(a.x)} ${yPos(a.y)} C ${xPos(a.x)} ${yPos(.5 + a.y)}, ${xPos(b.x)} ${yPos(-0.5 + b.y)}, ` :
          `${xPos(a.x)} ${yPos(a.y)} C ${xPos(a.x)} ${yPos(.5 + a.y)}, ${xPos(1 + b.x)} ${yPos(b.y)}, `
      ).join("") + ` ${xPos(last.x)} ${yPos(last.y)}`
    } else {
      return "M " + mapTuples(ps, (a, b) =>
        `${xPos(a.x)} ${yPos(a.y)} C ${xPos(a.x)} ${yPos(.5 + a.y)}, ${xPos(b.x)} ${yPos(-0.5 + b.y)}, `
      ).join("") + ` ${xPos(last.x)} ${yPos(last.y)}`
    }
  }

  // Collect clicks in Subject
  let clicks = new Rx.Subject<string[]>()
  let groupClicks = new Rx.Subject<string>()
  let tickSelection = new Rx.Subject<number>()
  let uievents = new Rx.Subject<UIEvent>()

  // Determine shown subscription flow
  let flow: IObserverTree[] = []
  if (
    focusNodes.every(n => graphs.subscriptions.hasNode(n)) &&
    mapTuples(focusNodes, (v, w) => graphs.subscriptions.hasEdge(v, w))
  ) {
    flow = focusNodes.map(n => graphs.subscriptions.node(n))
  }

  let flowPathIds = flow.map(_ => _.id)

  let handleClick = (v: string, w: string) => {
    if (flowPathIds.indexOf(v) >= 0 && flowPathIds.indexOf(w) >= 0) {
      uievents.next({ type: "selectionGraphNone" })
    } else {
      uievents.next({ type: "selectionGraphEdge", v, w })
    }
  }

  // Render edges
  function edge(edge: { v: string, w: string, points: { x: number, y: number }[] }): VNode {
    let { v, w, points } = edge
    // let labels = (graph.edge(v, w) || { labels: [] }).labels || []

    // Determine is normal subscription or higher order
    let isHigher = false
    let vSub = graphs.subscriptions.node(v)
    let vObs = vSub && vSub.observable
    let wSub = graphs.subscriptions.node(w)
    let wObs = wSub && wSub.observable
    if (vObs && wObs && wObs.sources && wObs.sources.some(s => s.id === vObs.id)) {
      isHigher = false
    } else {
      isHigher = true
    }

    // disable higher order distinction for now
    isHigher = false

    let isSelected = flowPathIds.indexOf(v) >= 0 && flowPathIds.indexOf(w) >= 0
    let isHoovered = hooverNodes.indexOf(v) >= 0 && hooverNodes.indexOf(w) >= 0

    let alpha = isHoovered ? (isSelected ? 0.4 : 0.3) : (isSelected ? 0.3 : 0.1)
    let isBlueprint = v.indexOf("-blueprint") >= 0

    return h("path", {
      attrs: {
        d: bpath(points, false && isHigher),
        fill: "transparent",
        id: `${v}/${w}`,
        stroke: isBlueprint ?
          "rgba(0, 125, 214, 0.33)" :
          (isHigher ? `rgba(200,0,0,${alpha})` : `rgba(0,0,0,${alpha})`),
        "stroke-width": 10,
      },
      hook: { prepatch: MorphModule.prepare },
      key: `${v}/${w}`,
      on: {
        click: () => handleClick(v, w),
        mouseover: () => debug(v, w, graph.edge(v, w)),
      },
      style: {
        transition: "d 0.5s, stroke 0.5s",
      },
    })
  }

  type RenderNode = { id: string, x: number, y: number }

  // Render nodes
  function circle(cluster: { node: IObservableTree, dots: RenderNode[] }): { svg: VNode[], html: VNode[] } {
    let node = cluster.node
    let text = nodeLabel(node)
    let isSelected = cluster.dots.some(item => flowPathIds.indexOf(item.id) >= 0)
    let isBlueprint = node.id.indexOf("-blueprint") >= 0
    let colors = isBlueprint ? {
      fill: "white",
      stroke: "rgba(0, 125, 214, 1)",
    } : {
        fill: colorIndex(parseInt(node && node.id || cluster.dots[0].id, 10)),
        stroke: undefined,
      }

    let bounds = {
      x1: Math.min(...cluster.dots.map(_ => xPos(_.x))),
      x2: Math.max(...cluster.dots.map(_ => xPos(_.x))),
      y: yPos(cluster.dots[0].y),
    }

    let rect = h("path", {
      attrs: {
        d: spath(cluster.dots),
        id: `cluster-${node.id}`,
        stroke: colors.fill,
        "stroke-width": 10,
        "stroke-linecap": "round",
      },
      hook: { prepatch: MorphModule.prepare },
      key: `cluster-${node.id}-${bounds.y}`,
      style: {
        transition: "d 0.5s",
      },
    })

    let handlers = {
      click: (item: { id: string }) => (e: any) => {
        console.log(focusNodes, "checking", item.id, focusNodes.indexOf(item.id) < 0)
        uievents.next(focusNodes.indexOf(item.id) < 0 ?
          { type: "selectionGraphNode", node: item.id } :
          { type: "selectionGraphNone" }
        )
      },
      mouseover: (item: { id: string }) => (e: any) => debug(item.id, graph.node(item.id)),
    }

    let circ = cluster.dots.map(item => h("circle", {
      attrs: {
        cx: xPos(item.x),
        cy: yPos(item.y),
        fill: colors.fill,
        id: `cluster-${node.id}/circle-${item.id}`,
        r: 5,
        stroke: colors.stroke,
      },
      key: `cluster-${node.id}/circle-${item.id}`,
      on: { click: handlers.click(item), mouseover: handlers.mouseover(item) },
      style: { transition: "all 0.5s" },
    }))

    let svg = [rect, /*shade, */...circ]

    let html = [h("div", {
      attrs: { class: `graph-label ${isSelected ? "focus" : ""}` },
      key: `overlay-${cluster.node.id}`,
      on: {
        click: (e: any) => {
          // cluster.dots[0].reverse().forEach(item => clicks.onNext(item.id))
        },
        mouseover: (e: any) => debug(cluster, cluster.node),
      },
      style: {
        left: `${bounds.x1}px`,
        // "padding-left": `${mu * (bounds.x2 - bounds.x1)}px`,
        top: `${bounds.y}px`,
        "padding-left": `${bounds.x2 - bounds.x1}px`,
        transition: "all 0.5s",
        "box-sizing": "content-box",
      },

    }, [
        ...cluster.dots.reverse().map(item => h("div", {
          on: { click: handlers.click(item), mouseover: handlers.mouseover(item) },
          style: {
            position: "absolute",
            top: `0`,
            left: `${(xPos(item.x) - bounds.x1 + 5)}px`,
            width: "10px",
            height: "10px",
            "margin-top": "5px",
            "z-index": 9999,
            cursor: "pointer",
          },
        })),
        h("span", text)]
    )]

    return { html: [...html], svg }
  }

  // Cluster layout nodes
  let ns = layout[0].nodes.reduce(({ list, last }, n) => {
    let obs = getObservable(n.id, graphs.main, graphs.subscriptions) || n
    if (last && last[0] === obs.id && last[1] === n.y) {
      list.slice(-1)[0].dots.push(n)
    } else {
      list.push({ dots: [n], node: obs })
    }
    return { list, last: [obs.id, n.y] }
  }, {
      last: null,
      list: [] as { node: { id: string }, dots: RenderNode[] }[],
    }).list.map(circle)

  let elements = [
    // h("g", gps),
    h("g", layout.flatMap((level, levelIndex) => level.edges.map(edge)).sort(vnodeSort).filter(v => {
      if (typeof v === "undefined") {
        console.warn("emitting undefined as child vnode")
      }
      return typeof v !== "undefined"
    })),
    h("g", ns.flatMap(n => n.svg).sort(vnodeSort).filter(v => {
      if (typeof v === "undefined") {
        console.warn("emitting undefined as child vnode")
      }
      return typeof v !== "undefined"
    })),
  ]

  let svg = h("svg", {
    attrs: {
      id: "structure",
      version: "1.1",
      xmlns: "http://www.w3.org/2000/svg",
    },
    style: {
      height: (ymax + 1) * my,
      left: 0,
      position: "absolute",
      top: 0,
      width: Math.min((xmax + 2) * mx, 400),
    },
  }, elements.concat(defs()))

  let mask = h("div", {
    attrs: {
      id: "structure-mask",
    },
    style: {
      height: `${(ymax + 1) * my + 30}px`,
      position: "relative",
      width: `${Math.min((xmax + 2) * mx, 400)}px`,
    },
  }, [svg].concat(ns.flatMap(n => n.html)))

  let panel = h("div.flexy.flexy-v.noflex.heightauto", [h("master", h("div", [mask]))])

  if (layout.length === 0 || layout[0].nodes.length === 0) {
    panel = h("div.flexy.flexy-v", [h("master.center",
      h("div.nograph.center", [h("p", "No data collected. Hit Run in the menu, or start your collector.")])
    )])
  }

  // Optionally show flow
  let diagram: VNode[]
  if (!flow.length && layout.length > 0 && layout[0].nodes.length > 0) {
    diagram = [h("div.nomarbles", [h("p", "Select a flow in the structure to show it's marble diagram.")])]
  } else if (!flow.length) {
    diagram = []
  } else if (flow.length) {
    diagram = renderMarbles(
      flow.flatMap(observer => [
        {
          type: "observable" as "observable", value: observer.observable,
          y: layout[0].nodes.filter(n => n.id === observer.id).map(n => yPos(n.y))[0],
        },
        {
          type: "observer" as "observer", value: observer,
          y: layout[0].nodes.filter(n => n.id === observer.id).map(n => yPos(n.y))[0],
        },
      ]),
      viewState,
      layout[0].nodes.filter(n => n.id === flow[0].id).slice(0, 1).map(n => yPos(n.y))[0],
      sub => {
        // Gather incoming higher order subscriptions
        return graphs.main.inEdges(sub.id)
          .map(e => graphs.main.node(e.v))
          .filter(n =>
            "observable" in n &&
            (n as IObserverTree).observable.id !== sub.observable.sources[0].id
          ) as IObserverTree[]
      },
      event => uievents.next(event),
      graphs.time.max(),
      id => graphs.subscriptions.node(id)
    )
  }

  let currentTick = typeof viewState.tick === "number" ? viewState.tick : graphs.time.max()
  let app =
    h("div.app.flexy", { key: "app" }, [
      panel,
      layout.length === 0 || layout[0].nodes.length === 0 ?
        undefined :
        h(`detail.flexy.rel${!flow.length ? ".center" : ""}`, diagram),
    ])

  let timeSlider = slider(graphs.time.min(), graphs.time.max(), currentTick, (v, final) => uievents.next({
    type: "tickSelection",
    tick: v === graphs.time.max() && final ? undefined : v,
  }))

  return {
    svg: app,
    clicks,
    groupClicks,
    tickSelection,
    timeSlider,
    uievents,
  }
}

function collect(start: string, f: (start: string) => string[]): string[] {
  return f(start).flatMap(n => [n].concat(collect(n, f)))
}

const colors = generateColors(40)
function colorIndex(i: number, alpha: number = 1) {
  if (typeof i === "undefined" || isNaN(i)) { return "transparent" }
  let [r, g, b] = colors[i % colors.length]
  return alpha === 1 ? `rgb(${r}, ${g}, ${b}) ` : `rgba(${r}, ${g}, ${b}, ${alpha}) `
}

if (typeof window === "object") {
  (window as any).colors = colors
}

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

export type MarbleClick = MarbleClick
export type MarbleHoover = MarbleHoover
export type DiagramOperatorHoover = DiagramOperatorHoover
export type DiagramOperatorClick = DiagramOperatorClick
export type HigherOrderHoover = HigherOrderHoover
export type HigherOrderClick = HigherOrderClick
export type UIEvent = UIEvent

function renderMarbles(
  nodes: (
    { type: "observable", value: IObservableTree, y: number } |
    { type: "observer", value: IObserverTree, y: number }
  )[],
  viewState: ViewState,
  offset: number = 0,
  incoming?: (target: IObserverTree) => IObserverTree[],
  uiEvents?: (event: UIEvent) => void,
  maxTick?: number,
  findSubscription?: (id: string) => IObserverTree,
): VNode[] {
  nodes = nodes.filter(n => typeof n !== "undefined")
  let coordinator = new MarbleCoordinator(e => e.timing.clocks[viewState.scheduler] || e.timing.clocks.tick)
  coordinator.set(0, maxTick)
  let allEvents: IEvent[] = nodes.flatMap((n: any) => n.type === "observer" ? n.value.events as IEvent[] : [])
  coordinator.add(allEvents)

  let heights = nodes.map(tree => tree.type === "observer" ? 60 : 40)
  let height = heights.reduce((sum, h) => sum + h, 0)
  let offsets = nodes.map((n, i, list) =>
    n.y - (i > 1 ? list[i - 2].y + (heights[i - 1] + heights[i - 2]) : (heights[0] / 2))
  )

  let timeMax = typeof viewState.tick === "number" ? 100 - coordinator.relTime(viewState.tick) : undefined
  let timeOverlays = typeof viewState.tick === "number" ? [h("div.timePadding", {
    style: {
      margin: "0 15px",
      position: "absolute",
      left: "0", right: "0",
      top: "0", bottom: "0",
    },
  }, [h("div.timeOverlay", {
    style: {
      position: "absolute",
      right: `calc(${timeMax}%)`, left: `-15px`,
      top: "0px", bottom: "0px",
      background: "rgba(33, 150, 243, 0.17)",
      "border-right": "2px solid #2196F3",
    },
  })])] : []

  let root = h("div#marbles", {
    key: "marbles",
    style: {
      height: `${height}px`,
      // "margin-top": `${(offset - heights[0] / 2)}px`,
      width: "0",
    },
  }, nodes.flatMap((node, i, nodeList) => {
    let clazz = `operator withoutStack 
      operator-${node.value && node.value.id} 
      above-${nodeList[i + 1] && nodeList[i + 1].value && nodeList[i + 1].value.id}`
    if (!node.value) {
      return [h("div", { attrs: { class: clazz } }, "Unknown node")]
    }

    let coloring = (nodeId: string) => colorIndex(parseInt(nodeId, 10))

    if (node.type === "observer") {
      let events: IEvent[] = node.value.events
      return [coordinator.render(node.value, events, uiEvents, debug, findSubscription, viewState, coloring)]
    } else {
      let obs = node.value
      let handlers = {
        click: () => uiEvents({ observable: node.value.id, type: "diagramOperatorClick" }),
        mouseover: () => uiEvents({ observable: node.value.id, type: "diagramOperatorHoover" }),
      }
      let box = h("div", { attrs: { class: clazz }, style: { "margin-top": `${offsets[i]}px` }, on: handlers }, [
        h("div", [
          ...name(obs),
          schedulerIcon(obs.scheduler),
        ]),
        // h("div", [], incoming ? incoming(nodeList[i + 1] as IObserverTree).map(o => o.id).join(",") : "no subs"),
        h("div", [], "stackFrame locationText"),
      ].filter((_, idx) => idx === 0))

      return [box]
    }
  }))
  return [root, ...timeOverlays]
}

type ExtendedArgument = { type: "number" | "string" | "function", value: any } | { type: "ref", $ref: any, value: any }
function interactiveArgs(args: string | (string | ExtendedArgument)[]): (VNode | string)[] {
  if (typeof args === "string") {
    return [args.substr(0, 97) + (args.length > 97 ? "..." : "")]
  } else {
    if (Array.isArray(args)) {
      return interleave(", ", args.map(arg => {
        if (typeof arg === "string") {
          return arg
        } else if (arg.type === "ref") {
          let color = colorIndex(parseInt(arg.$ref, 10))
          return h(`span.argument.argument-type-ref`, {
            style: { background: color },
          }, arg.value)
        } else {
          return h(`span.argument.argument-type-${arg.type}`, arg.value)
        }
      }))
    }
  }
}

function schedulerIcon(scheduler: ISchedulerInfo): VNode {
  if (!scheduler) {
    return undefined
  }
  switch (scheduler.type) {
    case "virtual":
      return h("div.right", h("span.scheduler", [h("i.scheduler-icon.virtual"), scheduler.name]))
    default:
      return h("div.right", h("span.scheduler", [h("i.scheduler-icon"), scheduler.name]))

  }
}

// tslint:disable:no-conditional-assignment
function debug(...args: any[]) {
  let panel: HTMLElement
  if (typeof document === "object" && (panel = document.getElementById("debug"))) {
    panel.innerText = args.map(a => jsonify(a)).join("\n")
  } else {
    // console.log.apply(console, args)
  }
}

function name(obs: IObservableTree): (string | VNode)[] {
  let name = obs.names && obs.names[obs.names.length - 1]
  let call = obs.calls && obs.calls[obs.calls.length - 1]
  return call && call.method ? [call.method, " (", ...interactiveArgs(call.args as any), ")"] : [name]
}

function interleave<T>(val: T, list: T[]): T[] {
  let result = [] as T[]
  for (let i = 0; i < list.length; i++) {
    result.push(list[i])
    if (i < list.length - 1) {
      result.push(val)
    }
  }
  return result
}
