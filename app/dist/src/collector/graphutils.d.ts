import "../utils";
import { Edge as GraphEdge, Graph } from "graphlib";
export declare function clone(g: Graph, edgeFilter?: (e: GraphEdge) => boolean, transform?: (e: GraphEdge) => GraphEdge[]): Graph;
/**
 * @see https://github.com/cpettitt/dagre/blob/master/lib/rank/util.js
 */
export declare function rankLongestPath(g: Graph): {
    [id: string]: number;
};
export declare type Label = string;
export declare type LayoutItem<Label> = {
    node: Label;
    x: number;
    y: number;
    isDummy: boolean;
    barycenter: number;
};
export declare type LayouterInput = {
    graph: Graph;
};
export declare type LayouterOutput<Label> = {
    graph: Graph;
    layout: LayoutItem<Label>[];
};
export declare function structureLayout(g: Graph): LayouterOutput<Label>;
export declare type PriorityLayoutItem = {
    x: number;
    readonly priority: number;
    readonly barycenter: number;
};
export declare function priorityLayoutReorder<Label>(items: PriorityLayoutItem[]): void;
export declare function lines(g: Graph): string[][];
export declare function indexedBy<T>(selector: (item: T) => string, list: T[]): {
    [key: string]: T;
};
export declare function groupBy<T>(selector: (item: T) => string, list: T[]): {
    [key: string]: T[];
};
export declare function groupByUniq<T, K extends (string | number)>(selector: (item: T) => K, list: T[]): {
    [key: string]: T[];
};
