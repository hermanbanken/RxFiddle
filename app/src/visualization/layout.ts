import { indexedBy, rankFromTopGraph, removeSlack } from "../collector/graphutils"
import TypedGraph from "../collector/typedgraph"
import { normalize } from "../layout/normalize"
import { fixingSort, ordering } from "../layout/ordering"
import { priorityLayout } from "../layout/priority"
import "../object/extensions"
import "../utils"
// import * as dagre from "dagre"
// import { Graph } from "graphlib"

export default function layout<V, E>(
  graph: TypedGraph<V, E>,
  focusNodes: string[] = [],
  distance: (a: string, b: string) => number = () => 1
): {
  edges: { points: { x: number, y: number }[], v: string, w: string }[],
  nodes: { id: string, x: number, y: number }[],
}[] {

  // // Use Dagre:
  // graph.setGraph({ width: undefined })
  // dagre.layout(graph as any)
  // /* tslint:disable:no-unreachable */
  // let extractNode = (n: string, l: { x: number, y: number }) => ({ x: l.x / 50, y: l.y / 50, id: n })
  // let extractEdge = (v: string, w: string, l: { points: { x: number, y: number }[] }) => ({
  //   v, w,
  //   points: l.points.map(p => ({ x: isNaN(p.x) ? 0 : p.x / 50, y: isNaN(p.y) ? 0 : p.y / 50 }))
  // })

  // if (1 === 1) {
  //   return [{
  //     edges: graph.edges().map(e => extractEdge(e.v, e.w, graph.edge(e) as any)),
  //     nodes: graph.nodes().map(n => extractNode(n, graph.node(n) as any)),
  //   }]
  // }

  let ranked = normalize(removeSlack(rankFromTopGraph(graph)), v => ({ rank: v.rank }))

  let initialOrd: string[][] = ranked.nodes()
    .map(n => ({ n, rank: ranked.node(n).rank }))
    .sort((a, b) => a.rank - b.rank)
    .reduce(({ store, lastRank }, next) => {
      if (lastRank !== next.rank) { store.push([]) }
      store[store.length - 1].push(next.n)
      return { store, lastRank: next.rank }
    }, { lastRank: -Infinity, store: [] as string[][] }).store

  // TODO verify neccessity of this step
  let rankedAndEdgeFixed = ranked.flatMap(
    (id, label) => [{ id, label }],
    (id, label) => [{ id: ranked.node(id.v).rank < ranked.node(id.w).rank ? id : { v: id.w, w: id.v }, label }]
  )

  // Re-add single component nodes removed during ranking
  console.log(graph.nodes())
  graph.nodes()
    .filter(n => !ranked.hasNode(n))
    .forEach(n => {
      console.log("re-adding", n)
      ranked.setNode(n, { rank: 0 })
    })

  let ord = ordering(initialOrd, rankedAndEdgeFixed, fixingSort(focusNodes))
  let layout = priorityLayout(ord, ranked, focusNodes, distance)
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
      w: e.nodes.slice(-1)[0],
    })
  }

  let edges = ranked.edges()
    .map(e => fullEdge(e.v, e.w, (v, w) => ranked.edge(v, w), n => byId[n]))
    .filter(v => typeof v !== "undefined")

  if (typeof window === "object") {
    (window as any).graph = graph;
    (window as any).ranked = ranked
  }

  return [
    {
      edges: edges as { points: [{ x: number, y: number }], v: string, w: string }[],
      nodes: layout.filter(node => node.id.indexOf("dummy") === -1),
    },
  ]
}
