import "../utils";
import { Graph } from "graphlib";
export declare type Direction = "up" | "down";
export declare function transpose(ranks: string[][], g: Graph, direction: Direction): string[][];
