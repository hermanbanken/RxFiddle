import { range } from "../collector/graphutils"
import TypedGraph from "../collector/typedgraph"
import { Edge } from "graphlib"

export type Ranked = { rank: number }
export type DummyEdge<E> = { original: E, nodes: string[], index: number }
export type RecreatedEdge<V, E> = { original: E, nodes: V[] }

export type Pathed<E> = { path?: E[] }

export function normalize<V extends Ranked, E>(
  g: TypedGraph<V, E>,
  createDummy: (dummyData: { id: string, rank: number }) => V
): TypedGraph<V, DummyEdge<E>> {

  let rank = (v: string) => g.node(v).rank
  let dummyNodes = [] as { id: string, rank: number }[][]

  // Without long edges
  let normalized = g.flatMap<V, DummyEdge<E>>((id, label) => [{ id, label }], (e, label: E) => {
    if (e.v === e.w || rank(e.v) === rank(e.w)) {
      // TODO prepare backlinks to be put back again in denormalize
      return []
    }

    // Reverse
    if (rank(e.v) > rank(e.w)) {
      // TODO make sure original is reversed again
      e = { v: e.w, w: e.v }
    }

    if (rank(e.v) + 1 < rank(e.w)) {
      // Add dummy nodes + edges
      let dummies = range(rank(e.v) + 1, rank(e.w)).map(i => ({ id: `dummy-${e.v}-${e.w}(${i})`, rank: i }))
      let nodes = [{ id: e.v, rank: rank(e.v) }].concat(dummies).concat([{ id: e.w, rank: rank(e.w) }])
      dummyNodes.push(nodes)
      return paired(nodes, (v, w, i) => ({
        id: { v: v.id, w: w.id },
        label: { index: i, nodes: nodes.map(n => n.id), original: label },
      }))
    } else {
      return [{ id: e, label: { index: 0, nodes: [e.v, e.w], original: label } }]
    }
  })

  dummyNodes.forEach(ns => ns.forEach(n => {
    normalized.setNode(n.id, createDummy(n))
  }))

  // Assert ok
  normalized.edges().forEach(e => {
    if (normalized.node(e.v).rank + 1 !== normalized.node(e.w).rank) {
      throw new Error("Invalid edge from normalization")
    }
  })

  return normalized
}

export function denormalize<V, E>(g: TypedGraph<V, DummyEdge<E>>): TypedGraph<V, RecreatedEdge<V, E>> {
  return g.flatMap(
    (id, label) => id.indexOf("dummy") === 0 ? [] : [{ id, label }],
    (id, label: DummyEdge<E>) => {
      return [{
        id: { v: label.nodes[0], w: label.nodes[label.nodes.length - 1] },
        label: {
          nodes: label.nodes.slice(1, -1).map(n => g.node(n)),
          original: label.original,
        },
      }]
    }
  )
}

function paired<T, R>(list: T[], f: (a: T, b: T, index: number) => R): R[] {
  return list.slice(1).map((w, i) => f(list[i], w, i))
}
