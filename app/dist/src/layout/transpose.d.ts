import "../utils";
import { Direction, ExternalSort } from "./index";
import { Graph } from "graphlib";
export declare let debug: {
    on: boolean;
};
export declare function transpose(ranks: string[][], g: Graph, direction: Direction, externalSort?: ExternalSort): string[][];
