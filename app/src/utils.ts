import { Edge, Graph } from "graphlib"
import * as GraphLib from "graphlib"
import * as rx from "rx"
import { PatchFunction, VNode } from "snabbdom"
import { RxFiddleNode } from "./collector/node"

/* tslint:disable:no-namespace */
/* tslint:disable:interface-name */

/* Extension of Rx */
declare module "rx" {
  export interface Observable<T> { }
  export interface Observer<T> {
    source?: Observable<any>
    o?: Observer<any>
  }
}

declare module "rx" {
  interface ObservableStatic {
    prototype: any
  }
}
interface ObservableStatic {
  prototype: any
}

/* Extension of Object prototype */
interface Object {
  getName(): string
}
function getName() {
  let funcNameRegex = /function (.{1,})\(/
  let results = (funcNameRegex).exec((this).constructor.toString())
  return (results && results.length > 1) ? results[1] : ""
}
(<any>Object.prototype).getName = getName

declare module "graphlib" {
  interface Graph {
    // new (options: { compound?: boolean, multigraph?: boolean }): Graph
    // height: number
    // width: number
    graph(): {
      width: number, height: number,
      ranker: "network-simplex" | "tight-tree" | "longest-path"
      rankdir: "TB" | "BT" | "LR" | "RL"
    }
    filterNodes(filter: (node: string) => boolean): Graph
    setGraph(g: {}): void
    setDefaultEdgeLabel(callback: () => void): any
  }
}

/* Declaration for StackFrame */
export interface StackFrame {
  functionName: string
  lineNumber: number
  columnNumber: number
  source: string
}

/* Extension of Snabbdom declaration */
declare module "snabbdom" {
  export interface PatchFunction {
    (oldVNode: VNode | HTMLElement, vnode: VNode): VNode;
  }
}

/* random */
export function endsWith(self: string, suffix: string): boolean {
  return self.indexOf(suffix, self.length - suffix.length) !== -1
};
