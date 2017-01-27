import "../object/extensions";
import "../utils";
import TypedGraph from "../collector/typedgraph";
import { VNode } from "snabbdom/vnode";
import * as Rx from "rx";
import { Edge as EdgeLabel, Message, NodeLabel } from "../collector/logger";
export interface DataSource {
    dataObs: Rx.Observable<Message>;
}
export declare type ViewState = {
    focusNodes: number[];
    openGroups: number[];
    openGroupsAll: boolean;
};
export declare type GraphNode = {
    name: string;
    labels: NodeLabel[];
};
export declare type GraphEdge = {
    labels: EdgeLabel[];
};
export declare class Grapher {
    graph: Rx.Observable<TypedGraph<GraphNode, GraphEdge>>;
    constructor(collector: DataSource, viewState?: Rx.Observable<ViewState>);
    private next(graph, event);
    private filter(graph, viewState);
}
export default class Visualizer {
    DOM: Rx.Observable<VNode>;
    private grapher;
    private app;
    constructor(grapher: Grapher, dom?: HTMLElement, controls?: HTMLElement);
    run(): void;
    attach(node: HTMLElement): void;
    step(): void;
}
