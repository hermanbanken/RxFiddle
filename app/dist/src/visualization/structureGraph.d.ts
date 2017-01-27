import "../object/extensions";
import "../utils";
import TypedGraph from "../collector/typedgraph";
import { Graph } from "graphlib";
import { VNode } from "snabbdom/vnode";
import { ViewState } from "./index";
export default class StructureGraph {
    static traverse(graph: Graph, choices?: string[]): string[];
    static branches(graph: Graph, node: string, choices: string[]): string[];
    static chunk: number;
    renderMarbles(graph: Graph, choices: string[]): VNode[];
    renderSvg(graph: TypedGraph<any, any>, viewState: ViewState): VNode[];
    private superImpose(root, g);
}
