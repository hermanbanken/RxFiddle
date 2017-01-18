import { LayerCrossingEdge, Leveled, ShadowEdge } from "../collector/grapher"
import { rankLongestPathGraph, indexedBy } from "../collector/graphutils"
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
  >) {

  let observables = graph.filterNodes((_, n) => n.level === "observable")
  let ranked = normalize(rankLongestPathGraph(observables), v => ({ rank: v.rank }))
  let byRank = [] as string[][]
  ranked.nodes().forEach((n: string) => {
    let rank = ranked.node(n).rank
    byRank[-rank] = (byRank[-rank] || []).concat([n])
  })

  let ord = ordering(Object.values(byRank).reverse(), ranked.flatMap(
    (id, label) => [{ id, label }],
    (id, label) => [{ id: ranked.node(id.v).rank < ranked.node(id.w).rank ? id : { v: id.w, w: id.v }, label }]
  ))
  console.log("ordening", ord)
  // throw new Error("abort")

  let layout = priorityLayout(ord, ranked)
  let byId = indexedBy(n => n.id, layout)

  let edges = ranked.edges().map(e => ranked.edge(e)).filter(e => e.index === 0).map(e => ({
    points: e.nodes.map(n => byId[n]).map(({ x, y }) => ({ x, y })),
    v: e.nodes[0],
    w: e.nodes[e.nodes.length - 1],
  }))

  debugger
  // console.log(layout)

  // console.log(ranked.toDot())

  /*
    // Convert dummy paths back to full paths
    let index = indexedBy(i => i.node, layout)
    let edges = g.edges().map(({v, w}) => {
      let mids: { x: number, y: number }[]
      if (ranks[v] + 1 < ranks[w]) {
        mids = range(ranks[v] + 1, ranks[w]).map(i => `dummy-${v}-${w}(${i})`)
          .map(k => index[k])
          .map(({x, y}) => ({ x, y }))
      } else {
        mids = []
      }
      return {
        v, w,
        points: [
          { x: index[v].x, y: index[v].y },
          ...mids,
          { x: index[w].x, y: index[w].y },
        ],
      }
    })
  
    return {
      graph: normalized,
      layout: layout.filter(v => !v.isDummy),
      edges,
    }
  */

  return {
    edges: edges as { points: [{ x: number, y: number }], v: string, w: string }[],
    nodes: layout,
  }

  // TODO:
  // get <rows> containing node ids
  // ordering(<rows>)
  // replace single obs with their subscriptions
  // do local-orderning per set of subs, traversing each tree of the observable
  // output and visualize
  // ...
  // profit
}

