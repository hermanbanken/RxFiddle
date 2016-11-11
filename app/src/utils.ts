import { Edge, Graph } from "graphlib"
import * as GraphLib from "graphlib"
import * as rx from "rx"
import { PatchFunction, VNode } from "snabbdom"
import { RxFiddleNode } from "./collector/node"

/* tslint:disable:no-namespace */
/* tslint:disable:interface-name */

/* Extension of Rx */

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
    // setGraph(label: string | {}): Graph
    setDefaultEdgeLabel(callback: () => void): any
    // neighbors(node: {}): string[]
    // edge(id: any, to?: any): any
    // edges(): Edge[]
    // nodes(): string[]
    // node(label: string): any
    // setEdge(sourceId: string, targetId: string, name: string): any
  }
}

// declare var dagre: Dagre.DagreFactory

// /* Extension of Dagre declaration */
// export namespace Dagre {
//   export interface DagreFactory {
//     // graphlib: "graphlib"
//     // layout(graph: Graph): void
//   }
//   interface Graph {
//     //   new (options: { compound?: boolean, multigraph?: boolean }): Graph
//     graph(): {
//       width: number, height: number,
//       ranker: "network-simplex" | "tight-tree" | "longest-path"
//       rankdir: "TB" | "BT" | "LR" | "RL"
//     }
//     //   neighbors(node: {}): Edge[]
//     //   edge(id: any, to?: any): any
//     //   edges(): Edge[]
//     //   nodes(): string[]
//     //   node(label: string): {}
//     setDefaultEdgeLabel(callback: () => void): any
//     // setEdge(sourceId: string, targetId: string, name: string): any
//     // }
//     // interface GraphLib {
//     //   Graph: Graph
//   }
// }

// declare var dagre: Dagre.DagreFactory

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
