import "../utils";
import { ICallRecord } from "./callrecord";
import { RxFiddleEdge } from "./edge";
import { ICollector } from "./logger";
import { RxFiddleNode } from "./node";
import { Graph } from "graphlib";
import { VNode } from "snabbdom";
export declare const HASH = "__hash";
export declare const IGNORE = "__ignore";
export declare type MethodName = string;
export interface RxCollector {
    wrapHigherOrder<T>(subject: Rx.Observable<any>, fn: Function): (arg: T) => T;
    before(record: ICallRecord, parents?: ICallRecord[]): this;
    after(record: ICallRecord): void;
}
export declare class Visualizer {
    edges: RxFiddleEdge[];
    nodes: RxFiddleNode[];
    g: Graph;
    dag: Graph;
    combined: Graph;
    svgZoomInstance: {
        destroy(): void;
    } | null;
    private showIdsBacking;
    showIds: boolean;
    private componentId;
    component: number;
    private choices;
    private app;
    private controls;
    private rendered;
    private collector;
    constructor(collector: ICollector, dom?: HTMLElement, controls?: HTMLElement);
    structureDag(): Graph;
    layout(graph?: Graph): void;
    size(graph?: Graph): {
        w: number;
        h: number;
    };
    highlightSubscriptionSource(id?: number, level?: number): void;
    process(): number;
    render(graph: Graph): VNode;
    selection(graphs: Graph[]): VNode[];
    run(): void;
    makeChoice(v: string, graph: Graph): void;
    descendants(graph: Graph, v: string): string[];
    attach(node: HTMLElement): void;
    step(): void;
    private setNode(id, label);
    private setEdge(from, to, edge);
    private edge(from, to?);
    private node(label);
}
