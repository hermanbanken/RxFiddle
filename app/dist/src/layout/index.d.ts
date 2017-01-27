import "../utils";
import { Graph } from "graphlib";
export declare type Direction = "up" | "down";
export declare type Edge = {
    v: string;
    w: string;
};
export declare function neg(d: Direction): Direction;
export declare function foreachTuple<T>(direction: Direction, list: T[], f: (a: T, b: T, anr: number, bnr: number) => void): void;
export declare function flip(es: Edge[]): Edge[];
export declare function edges(g: Graph, direction: Direction, nodes: string[]): Edge[];
