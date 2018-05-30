import feasibleTree from "./feasibleTree"
import { longestPath as initRank, simplify, slack } from "./utils"
import { Edge, Graph, alg } from "graphlib"
import * as _ from "lodash"

const preorder = (alg as any).preorder as (g: Graph, root?: string) => string[]
const postorder = (alg as any).postorder as (g: Graph, roots: string[]) => string[]

declare module "graphlib" {
  interface Graph {
    hasEdge(u: string, v: string): boolean
    removeEdge(u: string, v: string): void
  }
}

export default networkSimplex

/*
 * The network simplex algorithm assigns ranks to each node in the input graph
 * and iteratively improves the ranking to reduce the length of edges.
 *
 * Preconditions:
 *
 *    1. The input graph must be a DAG.
 *    2. All nodes in the graph must have an object value.
 *    3. All edges in the graph must have "minlen" and "weight" attributes.
 *
 * Postconditions:
 *
 *    1. All nodes in the graph will have an assigned "rank" attribute that has
 *       been optimized by the network simplex algorithm. Ranks start at 0.
 *
 *
 * A rough sketch of the algorithm is as follows:
 *
 *    1. Assign initial ranks to each node. We use the longest path algorithm,
 *       which assigns ranks to the lowest position possible. In general this
 *       leads to very wide bottom ranks and unnecessarily long edges.
 *    2. Construct a feasible tight tree. A tight tree is one such that all
 *       edges in the tree have no slack (difference between length of edge
 *       and minlen for the edge). This by itself greatly improves the assigned
 *       rankings by shorting edges.
 *    3. Iteratively find edges that have negative cut values. Generally a
 *       negative cut value indicates that the edge could be removed and a new
 *       tree edge could be added to produce a more compact graph.
 *
 * Much of the algorithms here are derived from Gansner, et al., "A Technique
 * for Drawing Directed Graphs." The structure of the file roughly follows the
 * structure of the overall algorithm.
 */

function networkSimplex(g: Graph) {
  g = simplify(g)
  initRank(g)
  let t = feasibleTree(g)
  initLowLimValues(t)
  initCutValues(t, g)

  let e
  let f

  // tslint:disable-next-line:no-conditional-assignment
  while ((e = leaveEdge(t))) {
    f = enterEdge(t, g, e)
    exchangeEdges(t, g, e, f)
  }
}

/*
 * Initializes cut values for all edges in the tree.
 */
function initCutValues(t: Graph, g: Graph) {
  let vs = postorder(t, t.nodes())
  vs = vs.slice(0, vs.length - 1)
  _.each(vs, (v) => {
    assignCutValue(t, g, v)
  })
}

function assignCutValue(t: Graph, g: Graph, child: string) {
  let childLab = t.node(child)
  let parent = childLab.parent
  t.edge(child, parent).cutvalue = calcCutValue(t, g, child)
}

/*
 * Given the tight tree, its graph, and a child in the graph calculate and
 * return the cut value for the edge between the child and its parent.
 */
function calcCutValue(t: Graph, g: Graph, child: string) {
  let childLab = t.node(child)
  let parent = childLab.parent
  // True if the child is on the tail end of the edge in the directed graph
  let childIsTail = true
  // The graph's view of the tree edge we're inspecting
  let graphEdge = g.edge(child, parent)
  // The accumulated cut value for the edge between this node and its parent
  let cutValue = 0

  if (!graphEdge) {
    childIsTail = false
    graphEdge = g.edge(parent, child)
  }

  cutValue = graphEdge.weight

  _.each(g.nodeEdges(child), (e: Edge) => {
    let isOutEdge = e.v === child
    let other = isOutEdge ? e.w : e.v

    if (other !== parent) {
      let pointsToHead = isOutEdge === childIsTail
      let otherWeight = g.edge(e).weight

      cutValue += pointsToHead ? otherWeight : -otherWeight
      if (isTreeEdge(t, child, other)) {
        let otherCutValue = t.edge(child, other).cutvalue
        cutValue += pointsToHead ? -otherCutValue : otherCutValue
      }
    }
  })

  return cutValue
}

function initLowLimValues(tree: Graph, root?: string) {
  if (arguments.length < 2) {
    root = tree.nodes()[0]
  }
  dfsAssignLowLim(tree, {}, 1, root)
}

function dfsAssignLowLim(tree: Graph, visited: { [key: string]: boolean }, nextLim: number, v: string, parent?: any) {
  let low = nextLim
  let label = tree.node(v)

  visited[v] = true
  _.each(tree.neighbors(v), (w) => {
    if (!_.has(visited, w)) {
      nextLim = dfsAssignLowLim(tree, visited, nextLim, w, v)
    }
  })

  label.low = low
  label.lim = nextLim++
  if (parent) {
    label.parent = parent
  } else {
    // TODO should be able to remove this when we incrementally update low lim
    delete label.parent
  }

  return nextLim
}

function leaveEdge(tree: Graph) {
  return _.find(tree.edges(), (e: Edge) => {
    return tree.edge(e).cutvalue < 0
  })
}

function enterEdge(t: Graph, g: Graph, edge: Edge) {
  let v = edge.v
  let w = edge.w

  // For the rest of this function we assume that v is the tail and w is the
  // head, so if we don't have this edge in the graph we should flip it to
  // match the correct orientation.
  if (!g.hasEdge(v, w)) {
    v = edge.w
    w = edge.v
  }

  let vLabel = t.node(v)
  let wLabel = t.node(w)
  let tailLabel = vLabel
  let flip = false

  // If the root is in the tail of the edge then we need to flip the logic that
  // checks for the head and tail nodes in the candidates function below.
  if (vLabel.lim > wLabel.lim) {
    tailLabel = wLabel
    flip = true
  }

  let candidates = _.filter(g.edges(), (e: Edge) => {
    return flip === isDescendant(t, t.node(e.v), tailLabel) &&
      flip !== isDescendant(t, t.node(e.w), tailLabel)
  })

  return _.minBy(candidates, (e: Edge) => { return slack(g, e) })
}

function exchangeEdges(t: Graph, g: Graph, e: Edge, f: Edge) {
  let v = e.v
  let w = e.w
  t.removeEdge(v, w)
  t.setEdge(f.v, f.w, {})
  initLowLimValues(t)
  initCutValues(t, g)
  updateRanks(t, g)
}

function updateRanks(t: Graph, g: Graph) {
  let root = _.find(t.nodes(), (v: string) => !g.node(v).parent)
  let vs = preorder(t, root)
  vs = vs.slice(1)
  _.each(vs, (v) => {
    let parent = t.node(v).parent
    let edge = g.edge(v, parent)
    let flipped = false

    if (!edge) {
      edge = g.edge(parent, v)
      flipped = true
    }

    g.node(v).rank = g.node(parent).rank + (flipped ? edge.minlen : -edge.minlen)
  })
}

/*
 * Returns true if the edge is in the tree.
 */
function isTreeEdge(tree: Graph, u: string, v: string) {
  return tree.hasEdge(u, v)
}

/*
 * Returns true if the specified node is descendant of the root node per the
 * assigned low and lim attributes in the tree.
 */
function isDescendant(tree: Graph, vLabel: any, rootLabel: any) {
  return rootLabel.low <= vLabel.lim && vLabel.lim <= rootLabel.lim
}
