import "../utils";
import TypedGraph from "./typedgraph";
import { Edge as GraphEdge, Graph } from "graphlib";
export declare function last<T>(list: T[]): T;
export declare function head<T>(list: T[]): T;
export declare function takeWhile<T>(list: T[], pred: (item: T) => boolean): T[];
export declare function range(start: number, exclusiveEnd: number): number[];
export declare type Direction = "down" | "up";
export declare function sweep<T>(input: T[][], direction: Direction, sort: (subject: T[], ref: T[]) => T[]): T[][];
/**
 * @see https://github.com/cpettitt/dagre/blob/master/lib/rank/util.js
 */
export declare function rankLongestPath(g: Graph): {
    [id: string]: number;
};
export declare function rankFromTop(g: Graph): {
    [id: string]: number;
};
export declare function rankLongestPathGraph<V, E>(g: TypedGraph<V, E>): TypedGraph<V & Ranked, E>;
export declare function rankFromTopGraph<V, E>(g: TypedGraph<V, E>): TypedGraph<V & Ranked, E>;
export declare type Label = string;
export declare type LayoutItem<Label> = {
    node: Label;
    x: number;
    y: number;
    fixedX?: number;
    isDummy: boolean;
    barycenter: number;
    hierarchicOrder: number[];
};
export declare type LayouterInput = {
    graph: Graph;
};
export declare type LayouterOutput<Label> = {
    graph: Graph;
    edges: {
        v: string;
        w: string;
        points: {
            x: number;
            y: number;
        }[];
    }[];
    layout: LayoutItem<Label>[];
};
export declare type Hierarchy = {
    hierarchicOrder: number[];
};
export declare type Fixable = {
    fixedX?: number;
};
export declare type Ranked = {
    rank: number;
};
export declare type InGraph<V extends Hierarchy & Fixable, E> = TypedGraph<V, E>;
export declare function structureLayout<V extends Hierarchy & Fixable & Ranked, E>(g: InGraph<V, E>): LayouterOutput<Label>;
export declare type PriorityLayoutItem = {
    x: number;
    readonly priority: number;
    readonly barycenter: number;
    readonly spacing?: number;
};
export declare function priorityLayoutAlign<Label>(items: PriorityLayoutItem[]): void;
export declare function lines(g: Graph): string[][];
export declare function indexedBy<T>(selector: (item: T) => string, list: T[]): {
    [key: string]: T;
};
export declare function groupBy<T>(selector: (item: T) => string | number, list: T[]): {
    [key: string]: T[];
};
export declare function groupByUniq<T, K extends (string | number)>(selector: (item: T) => K, list: T[]): {
    [key: string]: T[];
};
export declare function mapFilter<T, V>(list: T[], f: (item: T, index: number, list: T[]) => (V | undefined)): V[];
export declare function toDot<T>(graph: Graph, props?: (n: T) => any, edgeProps?: (e: GraphEdge) => any): string;
