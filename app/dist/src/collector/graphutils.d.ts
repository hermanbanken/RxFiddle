import "../utils";
import { Edge as GraphEdge, Graph } from "graphlib";
/**
 * @see https://github.com/cpettitt/dagre/blob/master/lib/rank/util.js
 */
export declare function rankLongestPath(g: Graph): void;
export declare function slack(g: Graph, e: GraphEdge): number;
