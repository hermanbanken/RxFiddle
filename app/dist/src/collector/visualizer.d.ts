import "../object/extensions";
import "../utils";
import { ICallRecord, ICallStart } from "./callrecord";
import { RxFiddleEdge } from "./edge";
import { ICollector } from "./logger";
import { RxFiddleNode } from "./node";
import TypedGraph from "./typedgraph";
import { Graph } from "graphlib";
import { VNode } from "snabbdom/vnode";
export interface RxCollector {
    wrapHigherOrder<T>(subject: Rx.Observable<any>, fn: Function): (arg: T) => T;
    before(record: ICallStart, parents?: ICallStart[]): this;
    after(record: ICallRecord): void;
}
export declare class Visualizer {
    metroLines: {
        [sink: number]: number[];
    };
    svgZoomInstance: {
        destroy(): void;
    } | null;
    collector: ICollector;
    private showIdsBacking;
    showIds: boolean;
    private componentId;
    component: number;
    private choices;
    private app;
    private controls;
    private rendered;
    private grapher;
    constructor(collector: ICollector, dom?: HTMLElement, controls?: HTMLElement);
    structureDag(): Graph;
    layout(graph?: TypedGraph<RxFiddleNode, RxFiddleEdge>): void;
    size(graph?: TypedGraph<RxFiddleNode, RxFiddleEdge>): {
        w: number;
        h: number;
    };
    highlightSubscriptionSource(id?: number, level?: number): void;
    render(graph: TypedGraph<RxFiddleNode, RxFiddleEdge>): VNode;
    selection(graphs: Graph[]): VNode[];
    run(): void;
    makeChoice(v: string, graph: Graph): void;
    descendants(graph: Graph, v: string): string[];
    attach(node: HTMLElement): void;
    step(): void;
}
