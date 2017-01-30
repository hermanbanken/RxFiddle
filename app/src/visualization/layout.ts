import { indexedBy, rankFromTopGraph } from "../collector/graphutils"
import TypedGraph from "../collector/typedgraph"
import { normalize } from "../layout/normalize"
import { ordering, fixingSort } from "../layout/ordering"
import { priorityLayout } from "../layout/priority"
import "../object/extensions"
import "../utils"

export default function layout<V, E>(graph: TypedGraph<V, E>, focusNodes: string[] = []): {
  edges: { points: [{ x: number, y: number }], v: string, w: string }[],
  nodes: { id: string, x: number, y: number }[],
}[] {
  let ranked = normalize(rankFromTopGraph(graph), v => ({ rank: v.rank }))

  let byRank = [] as string[][]
  ranked.nodes().forEach((n: string) => {
    let rank = ranked.node(n).rank
    byRank[rank] = (byRank[rank] || []).concat([n])
  })

  let initialOrd = Object.values(byRank)

  // TODO verify neccessity of this step
  let rankedAndEdgeFixed = ranked.flatMap(
    (id, label) => [{ id, label }],
    (id, label) => [{ id: ranked.node(id.v).rank < ranked.node(id.w).rank ? id : { v: id.w, w: id.v }, label }]
  )

  let ord = ordering(initialOrd, rankedAndEdgeFixed, fixingSort(focusNodes))
  let layout = priorityLayout(ord, ranked, focusNodes)
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
      nodes: layout,
    },
  ]
}
