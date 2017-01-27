import "../object/extensions";
import "../utils";
import { StackFrame } from "../utils";
import { ICallRecord } from "./callrecord";
import { RxFiddleEdge } from "./edge";
import { AddObservable, AddSubscription, ICollector } from "./logger";
import { RxFiddleNode } from "./node";
import TypedGraph from "./typedgraph";
import { Edge as GraphEdge, Graph } from "graphlib";
export interface RxCollector {
    wrapHigherOrder<T>(subject: Rx.Observable<any>, fn: Function): (arg: T) => T;
    before(record: ICallRecord, parents?: ICallRecord[]): this;
    after(record: ICallRecord): void;
}
export declare type LevelType = "code" | "observable" | "subscription";
export declare type Leveled<T> = {
    id: string;
    level: LevelType;
    payload: T;
    hierarchicOrder: number[];
};
export declare type LayerCrossingEdge = {
    upper: LevelType;
    lower: LevelType;
};
export declare type ShadowEdge = {
    shadow: boolean;
    count: number;
};
export declare class Grapher {
    edges: RxFiddleEdge[];
    nodes: RxFiddleNode[];
    g: TypedGraph<RxFiddleNode, RxFiddleEdge>;
    dag: TypedGraph<RxFiddleNode, RxFiddleEdge>;
    combined: TypedGraph<RxFiddleNode, undefined>;
    metroLines: {
        [sink: number]: number[];
    };
    svgZoomInstance: {
        destroy(): void;
    } | null;
    leveledGraph: TypedGraph<Leveled<AddSubscription | AddObservable | StackFrame>, LayerCrossingEdge | ShadowEdge>;
    private collector;
    private processed;
    constructor(collector: ICollector);
    structureDag(): Graph;
    handleLogEntry(el: any): void;
    process(): number;
    descendants(graph: Graph, v: string): string[];
    setNode(id: number, label: RxFiddleNode): RxFiddleNode;
    edgeExists(from: number, to: number): boolean;
    setEdge(from: number, to: number, edge: RxFiddleEdge): void;
    edge(from: number | GraphEdge, to?: number): RxFiddleEdge | undefined;
    node(label: string | number): RxFiddleNode | undefined;
    private incrementDown(from, to);
}
