import { generateColors } from "../color"
import layoutf from "../layout/layout"
import "../object/extensions"
import "../utils"
import { StackFrame } from "../utils"
import { IEvent } from "../collector/event"
import { LayerCrossingEdge, Leveled, ShadowEdge } from "../collector/grapher"
import {
  LayouterOutput, Ranked,
} from "../collector/graphutils"
import { AddObservable, AddSubscription } from "../collector/logger"
import { RxFiddleNode } from "../collector/node"
import TypedGraph from "../collector/typedgraph"
import { Graph } from "graphlib"
import * as snabbdom from "snabbdom"
import { h } from "snabbdom/h"
import { VNode } from "snabbdom/vnode"
import { ViewState } from "./index"

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

export default class StructureGraph {

  public static traverse(graph: Graph, choices: string[] = []): string[] {
    if (typeof graph === "undefined") { return [] }

    let path: string[] = []
    let sources = graph.sources()
    do {
      // select first from choices or from successors otherwise
      let current = sources.find(source => choices.indexOf(source) >= 0) || sources[0]
      path.unshift(current)
      sources = graph.successors(current)
    } while (sources.length)

    return path.reverse()
  }

  public static branches(graph: Graph, node: string, choices: string[]): string[] {
    if (typeof graph === "undefined") { return [] }

    let successors = graph.successors(node)
    let chosen = successors.find(n => choices.indexOf(n) >= 0) || successors[0]
    return successors.filter(s => s !== chosen)
  }

  public static chunk: number = 100

  public renderMarbles(graph: Graph, choices: string[]): VNode[] {
    let coordinator = new MarbleCoordinator()
    let u = StructureGraph.chunk
    let main = StructureGraph.traverse(graph, choices)
    main.forEach((v) => coordinator.add(graph.node(v)))

    let root = h("div", {
      attrs: {
        id: "marbles",
        style: `width: ${u * 2}px; height: ${u * (0.5 + main.length)}px`,
      },
    }, main.flatMap((v, i) => {
      let clazz = "operator " + (typeof graph.node(v).locationText !== "undefined" ? "withStack" : "")
      let box = h("div", { attrs: { class: clazz } }, [
        h("div", [], graph.node(v).name),
        h("div", [], graph.node(v).locationText),
      ])
      return [box, coordinator.render(graph.node(v))]
    }))
    return [root]
  }

  public renderSvg(
    graph: TypedGraph<any, any>,
    viewState: ViewState,
  ): VNode[] {
    let u = StructureGraph.chunk;
    (window as any).renderSvgGraph = graph

    let layout = layoutf(graph)

    let mu = u / 2

    let elements = layout.flatMap((level, levelIndex) => {
      let edges = level.edges.map(({ v, w, points }) => {
        let path = points.map(({x, y}) => `${mu + mu * x} ${mu + mu * y}`).join(" L ")
        return h("path", {
          attrs: {
            d: `M${path}`,
            stroke: levelIndex === 0 ? "rgba(0,0,0,0.1)" : "gray",
            // "stroke-dasharray": 5,
            "stroke-width": levelIndex === 0 ? 10 : 2,
          },
          on: { mouseover: () => console.log(graph.edge(v, w)) },
        })
      })
      return edges
    }).concat(layout[0].nodes.map(item => h("circle", {
      attrs: {
        cx: mu + mu * item.x,
        cy: mu + mu * item.y,
        fill: colorIndex(parseInt(item.id, 10)),
        r: 5,
      },
      on: {
        click: (e: any) => console.log(item.id),
      }
    })))

    // commented 2017-01-13 friday 9:50 
    // let ranked = rankLongestPathGraph(graph
    //   // .filterEdges(v => v.w < v.v)
    //   .filterNodes((_, n) => n.level === "observable")
    // )
    // let rootLayout = structureLayout(ranked)
    // let fullLayout = rootLayout.layout //this.superImpose(rootLayout, graph)
    let g = graph
      .filterEdges(v => v.w < v.v)
      .filterNodes((_, n) => n.level === "subscription") as TypedGraph<Leveled<AddSubscription> & Ranked, ShadowEdge>

    let xmax = layout
      .flatMap(level => level.nodes)
      .reduce((p: number, n: { x: number }) => Math.max(p, n.x), 0) as number

    return [h("svg", {
      attrs: {
        id: "structure",
        style: `width: ${xmax * u}px; height: ${u * (0.5 + elements.length)}px`,
        version: "1.1",
        xmlns: "http://www.w3.org/2000/svg",
      },
    }, elements)]
  }

  private superImpose(root: LayouterOutput<string>, g: TypedGraph<
    Leveled<StackFrame | AddObservable | AddSubscription>,
    LayerCrossingEdge | ShadowEdge | undefined
    >) {
    // TODO
    let layout = root.layout.flatMap(item => {
      let subs = g.outEdges(item.node)
        .flatMap(e =>
          typeof g.edge(e) === "object" && (g.edge(e) as LayerCrossingEdge).lower === "subscription" ? [e.w] : []
        )
      console.log("subs", subs)
      if (subs.length) {
        return subs.map((sub, index) => Object.assign({}, item, {
          node: sub,
          x: item.x + (index / subs.length - 0.5)
        })).concat([item])
      } else {
        return [item]
      }
    })
    return layout
  }

}

class MarbleCoordinator {
  private min: number
  private max: number

  public add(node: RxFiddleNode): void {
    let times = node.observers.flatMap(v => v[2] as IEvent[]).map(e => e.time)
    this.min = times.reduce((m, n) => typeof m !== "undefined" ? Math.min(m, n) : n, this.min)
    this.max = times.reduce((m, n) => typeof m !== "undefined" ? Math.max(m, n) : n, this.max)
  }

  public render(node: RxFiddleNode): VNode {
    let events = node.observers.flatMap(v => v[2] as IEvent[])
    let marbles = events.map(e => h("svg", {
      attrs: { x: `${this.relTime(e.time)}%`, y: "50%" },
    }, [h("path", {
      attrs: { class: "arrow", d: "M 0 -50 L 0 48" },
    }), h("circle", {
      attrs: { class: e.type, cx: 0, cy: 0, r: 8 },
    })]))

    return h("svg", {
      attrs: {
        class: "marblediagram",
      },
    }, [
      h("line", { attrs: { class: "time", x1: "0", x2: "100%", y1: "50%", y2: "50%" } }),
    ].concat(marbles).concat(defs()))
  }

  private relTime(t: number): number {
    return (t - this.min) / (this.max - this.min) * 95 + 2.5
  }

}
