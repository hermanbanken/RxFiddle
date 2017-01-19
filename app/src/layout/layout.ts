import { LayerCrossingEdge, Leveled, ShadowEdge } from "../collector/grapher"
import { rankLongestPathGraph, rankLongestPath, indexedBy } from "../collector/graphutils"
import { AddObservable, AddSubscription } from "../collector/logger"
import TypedGraph from "../collector/typedgraph"
import { normalize, denormalize, DummyEdge } from "../layout/normalize"
import { ordering } from "../layout/ordering"
import { priorityLayout } from "../layout/priority"
import "../object/extensions"
import { StackFrame } from "../utils"
import "../utils"

export default function layout(graph: TypedGraph<
  Leveled<(StackFrame | AddObservable | AddSubscription)>,
  LayerCrossingEdge | ShadowEdge | undefined
  >): {
    edges: { points: [{ x: number, y: number }], v: string, w: string }[],
    nodes: { id: string, x: number, y: number }[]
  }[] {

  let observables = graph.filterNodes((_, n) => n.level === "observable")
  let ranked = normalize(rankLongestPathGraph(observables), v => ({ rank: v.rank }))

  let byRank = [] as string[][]
  ranked.nodes().forEach((n: string) => {
    let rank = ranked.node(n).rank
    byRank[-rank] = (byRank[-rank] || []).concat([n])
  });

  let initialOrd = Object.values(byRank).reverse()
  let rankedAndEdgeFixed = ranked.flatMap(
    (id, label) => [{ id, label }],
    (id, label) => [{ id: ranked.node(id.v).rank < ranked.node(id.w).rank ? id : { v: id.w, w: id.v }, label }]
  )

  // Observable layout
  let ord = ordering(initialOrd, rankedAndEdgeFixed)

  // Subscription layout
  let subscriptions = graph.filterNodes(n => graph.node(n).level === "subscription")
  ord.map(row => row.flatMap(n => {
    let subs = (graph.inEdges(n) || []).filter(test(graph, e => "upper" in e)).map(e => e.v)
    return [n].concat(subs)
  }))


  let layout = priorityLayout(ord, ranked)
  let byId = indexedBy(n => n.id, layout)

  type Expanded = { original: any, index: number, nodes: string[] }
  function fullEdge(
    v: string, w: string,
    edgeLookup: (v: string, w: string) => Expanded,
    lookup: (id: string) => { x: number, y: number }
  ) {
    let e = edgeLookup(v, w)
    if (typeof e === "undefined" || e.index > 0) {
      return undefined
    }
    return ({
      points: e.nodes.map(lookup),
      v: e.nodes[0],
      w: last(e.nodes),
    })
  }

  let edges = ranked.edges()
    .map(e => fullEdge(e.v, e.w, (v, w) => ranked.edge(v, w), n => byId[n]))
    .filter(v => typeof v !== "undefined");

  (window as any).graph = graph;
  (window as any).ranked = ranked;

  // var s = (window as any).s = ranked.flatMap(
  //   (id, label) => graph.inEdges(id)
  //     .filter(e => "upper" in graph.edge(e))
  //     .map(e => ({ id: e.v, label: graph.node(e.v) })),
  //   (id, label) => graph.inEdges(id.v)
  //     .filter(e => "lower" in graph.edge(e))
  //     .flatMap(e => graph.outEdges(e.v))
  //     .map(e => ({ id: e, label: graph.edge(e) }))
  // )

  function offsetX(index: number, total: number): number {
    let width = 0.1
    let left = total * width / -2 + width / 2
    return left + index * width
  }

  let level2nodes = layout.flatMap(({ x, y, id }) => (graph.outEdges(id) || [])
    .filter(test(graph, e => e && "lower" in e && (e as LayerCrossingEdge).lower === "subscription"))
    .map(e => e.w)
    .map((w, index, list) => ({
      x, y,
      id: w,
      origin: id,
      index,
      total: list.length,
    }))
  )
  let level2byId = indexedBy(i => i.id, level2nodes)
  let level2edges = graph.edges().filter(e => e.v in level2byId && e.w in level2byId).map(e => {
    let vo = level2byId[e.v].origin
    let wo = level2byId[e.w].origin
    let fe = fullEdge(vo, wo, (v, w) => {
      let firstTry = ranked.edge(v, w)
      if (typeof firstTry !== "undefined") { return firstTry }
      return ranked.nodeEdges(v).map(a => ranked.edge(a)).find(a => last(a.nodes) === w)
    }, n => {
      let level2node = level2byId[vo === n ? e.v : e.w]
      return {
        x: level2node.x + offsetX(level2node.index, level2node.total),
        y: level2node.y,
      }
    })

    if (typeof fe !== "undefined") {
      return fe
    } else {
      return {
        points: [byId[vo], byId[wo]],
        v: e.v,
        w: e.w,
      }
    }
  })

  return [
    {
      edges: edges as { points: [{ x: number, y: number }], v: string, w: string }[],
      nodes: layout,
    },
    {
      edges: level2edges as { points: [{ x: number, y: number }], v: string, w: string }[],
      nodes: level2nodes,
    },
  ]

  // TODO:
  // get <rows> containing node ids
  // ordering(<rows>)
  // replace single obs with their subscriptions
  // do local-orderning per set of subs, traversing each tree of the observable
  // output and visualize
  // ...
  // profit
}

function test<T, E>(graph: TypedGraph<T, E>, test: (item: E) => boolean): (e: { v: string, w: string }) => boolean {
  return (e) => {
    let label = graph.edge(e)
    if (typeof label === "undefined") {
      return false
    }
    return test(label)
  }
}

function last<T>(list: T[]): T {
  if (Array.isArray(list) && list.length > 0) {
    return list[list.length - 1]
  }
  return undefined
}
