import "../utils"
import { Edge as GraphEdge, Graph, alg, GraphOptions } from "graphlib"
import * as _ from "lodash"
import TypedGraph from "./typedgraph"

// TODO combine
// - join nodes of same parent based on StackFrame location
// - zipping any downstream relations too: if parent collapses => same rules apply
// - maintain count of join size
// - do not join if stackframe (?) is focussed
export function combine(g: Graph) {
  let t = new TypedGraph<Function,string>()
}