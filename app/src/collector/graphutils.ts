import "../utils"
import { Edge as GraphEdge, Graph } from "graphlib"
import * as _ from "lodash"

/**
 * @see https://github.com/cpettitt/dagre/blob/master/lib/rank/util.js
 */
export function rankLongestPath(g: Graph) {
  let visited: { [id: string]: boolean } = {}

  function dfs(v: string): number {
    let label = g.node(v)
    if (_.has(visited, v)) {
      return label.rank
    }
    visited[v] = true

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

export function slack(g: Graph, e: GraphEdge): number {
  return g.node(e.w).rank - g.node(e.v).rank - g.edge(e).minlen
}
