import { slack } from "./utils"
import { Edge, Graph } from "graphlib"
import * as _ from "lodash"

export default feasibleTree

/*
 * Constructs a spanning tree with tight edges and adjusted the input node's
 * ranks to achieve this. A tight edge is one that is has a length that matches
 * its "minlen" attribute.
 *
 * The basic structure for this function is derived from Gansner, et al., "A
 * Technique for Drawing Directed Graphs."
 *
 * Pre-conditions:
 *
 *    1. Graph must be a DAG.
 *    2. Graph must be connected.
 *    3. Graph must have at least one node.
 *    5. Graph nodes must have been previously assigned a "rank" property that
 *       respects the "minlen" property of incident edges.
 *    6. Graph edges must have a "minlen" property.
 *
 * Post-conditions:
 *
 *    - Graph nodes will have their rank adjusted to ensure that all edges are
 *      tight.
 *
 * Returns a tree (undirected graph) that is constructed using only "tight"
 * edges.
 */
function feasibleTree(g: Graph) {
  let t = new Graph({ directed: false })

  // Choose arbitrary node from which to start our tree
  let start = g.nodes()[0]
  let size = g.nodeCount()
  t.setNode(start, {})

  let edge: Edge
  let delta: number
  while (tightTree(t, g) < size && delta !== 0) {
    edge = findMinSlackEdge(t, g)
    delta = t.hasNode(edge.v) ? slack(g, edge) : -slack(g, edge)
    shiftRanks(t, g, delta)
  }

  return t
}

/*
 * Finds a maximal tree of tight edges and returns the number of nodes in the
 * tree.
 */
function tightTree(t: Graph, g: Graph) {
  function dfs(v: string) {
    _.each(g.nodeEdges(v), (e: Edge) => {
      let edgeV = e.v
      let w = (v === edgeV) ? e.w : edgeV
      if (!t.hasNode(w) && !slack(g, e)) {
        t.setNode(w, {})
        t.setEdge(v, w, {})
        dfs(w)
      }
    })
  }

  _.each(t.nodes(), dfs)
  return t.nodeCount()
}

/*
 * Finds the edge with the smallest slack that is incident on tree and returns
 * it.
 */
function findMinSlackEdge(t: Graph, g: Graph): Edge {
  return _.minBy(g.edges(), (e: Edge) => {
    if (t.hasNode(e.v) !== t.hasNode(e.w)) {
      return slack(g, e)
    }
    return 0
  })
}

function shiftRanks(t: Graph, g: Graph, delta: number) {
  _.each(t.nodes(), (v: string) => {
    g.node(v).rank += delta
  })
}
