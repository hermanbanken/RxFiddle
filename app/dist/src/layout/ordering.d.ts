import { ExternalSort } from "./index";
import { Graph } from "graphlib";
export declare function ordering(order: string[][], g: Graph, externalSort?: ExternalSort): string[][];
export declare function fixingSort(fixed: string[]): (a: string, b: string) => 0 | 1 | -1;
