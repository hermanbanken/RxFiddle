import { Graph } from "graphlib";
export declare type Layout = {
    y: number;
    x: number;
    id: string;
}[];
export declare function priorityLayout(ranks: string[][], g: Graph, focusNodes?: string[]): Layout;
export declare function head<T>(list: T[]): T;
export declare type PriorityLayoutItem = {
    x: number;
    readonly priority: number;
    readonly barycenter: number;
    readonly spacing?: number;
};
export declare function priorityLayoutAlign<Label>(items: PriorityLayoutItem[]): void;