import { VNode } from "snabbdom/vnode";
declare module "rx" {
    interface Observable<T> {
    }
    interface Observer<T> {
        source?: Observable<any>;
        o?: Observer<any>;
    }
}
declare module "rx" {
    interface ObservableStatic {
        prototype: any;
    }
}
declare global  {
    interface Array<T> {
        flatMap<R>(f: (t: T, index: number) => R[]): Array<R>;
    }
}
declare module "graphlib" {
    interface Graph {
        graph(): {
            width: number;
            height: number;
            ranker: "network-simplex" | "tight-tree" | "longest-path";
            rankdir: "TB" | "BT" | "LR" | "RL";
        };
        filterNodes(filter: (node: string) => boolean): Graph;
        setGraph(g: {}): void;
        setDefaultEdgeLabel(callback: () => void): any;
    }
}
export interface StackFrame {
    functionName: string;
    lineNumber: number;
    columnNumber: number;
    source: string;
}
declare module "snabbdom" {
    interface PatchFunction {
        (oldVNode: VNode | HTMLElement, vnode: VNode): VNode;
    }
}
export declare function endsWith(self: string, suffix: string): boolean;
