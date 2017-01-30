import { Edge as EdgeLabel, Message, NodeLabel } from "../collector/logger";
import TypedGraph from "../collector/typedgraph";
import "../object/extensions";
import "../utils";
import * as Rx from "rx";
import { VNode } from "snabbdom/vnode";
export interface DataSource {
    dataObs: Rx.Observable<Message>;
}
export declare type ViewState = {
    focusNodes: string[];
    openGroups: string[];
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
    constructor(collector: DataSource);
    private next(graph, event);
}
export default class Visualizer {
    focusNodes: Rx.Subject<string[]>;
    openGroups: Rx.Subject<string[]>;
    DOM: Rx.Observable<VNode>;
    readonly viewState: Rx.Observable<ViewState>;
    private clicks;
    private grapher;
    private app;
    constructor(grapher: Grapher, dom?: HTMLElement, controls?: HTMLElement);
    run(): void;
    attach(node: HTMLElement): void;
    step(): void;
    private filter(graph, viewState);
}
