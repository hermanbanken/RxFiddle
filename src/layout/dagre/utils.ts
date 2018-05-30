import { Edge, Graph } from "graphlib"
import * as _ from "lodash"

/*
 * Initializes ranks for the input graph using the longest path algorithm. This
 * algorithm scales well and is fast in practice, it yields rather poor
 * solutions. Nodes are pushed to the lowest layer possible, leaving the bottom
 * ranks wide and leaving edges longer than necessary. However, due to its
 * speed, this algorithm is good for getting an initial ranking that can be fed
 * into other algorithms.
 *
 * This algorithm does not normalize layers because it will be used by other
 * algorithms in most cases. If using this algorithm directly, be sure to
 * run normalize at the end.
 *
 * Pre-conditions:
 *
 *    1. Input graph is a DAG.
 *    2. Input graph node labels can be assigned properties.
 *
 * Post-conditions:
 *
 *    1. Each node will be assign an (unnormalized) "rank" property.
 */
export function longestPath(g: Graph) {
  let visited = {} as { [id: string]: boolean }

  function dfs(v: string): number {
    let label = g.node(v)
    if (_.has(visited, v)) {
      return label.rank;
    }
    visited[v] = true;

    let rank = _.min(_.map(g.outEdges(v), (e) => {
      return dfs(e.w) - g.edge(e).minlen
    }))

    if (rank === Number.POSITIVE_INFINITY) {
      rank = 0
    }

    return (label.rank = rank)
  }

  _.each(g.sources(), dfs)
}

/*
 * Returns the amount of slack for the given edge. The slack is defined as the
 * difference between the length of the edge and its minimum length.
 */
export function slack(g: Graph, e: Edge) {
  return g.node(e.w).rank - g.node(e.v).rank - g.edge(e).minlen
}

/*
 * Returns a new graph with only simple edges. Handles aggregation of data
 * associated with multi-edges.
 */
export function simplify(g: Graph) {
  let simplified: Graph = new Graph()
  simplified.setGraph(g.graph())
  _.each(g.nodes(), (v: string) => { simplified.setNode(v, g.node(v)) })
  _.each(g.edges(), (e: Edge) => {
    let simpleLabel = simplified.edge(e.v, e.w) || { minlen: 1, weight: 0 }
    let label = g.edge(e)
    simplified.setEdge(e.v, e.w, {
      minlen: Math.max(simpleLabel && simpleLabel.minlen || 0, label && label.minlen || 0),
      weight: simpleLabel && simpleLabel.weight + label && label.weight,
    })
  })
  return simplified
}
