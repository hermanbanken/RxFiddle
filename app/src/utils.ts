/* Extension of Rx */

/* tslint:disable */
module rx {
  interface ObservableStatic {
    prototype: any;
  }
}
interface ObservableStatic {
  prototype: any;
}
/* tslint:enable */

/* Extension of Object prototype */
interface Object {
  getName(): string;
}
function getName() {
  let funcNameRegex = /function (.{1,})\(/;
  let results = (funcNameRegex).exec((this).constructor.toString());
  return (results && results.length > 1) ? results[1] : "";
}
Object.prototype.getName = getName;

/* Extension of Dagre declaration */
declare namespace Dagre {
  interface DagreFactory {
    graphlib: GraphLib;
  }
  interface Graph {
    new (options: { compound?: boolean, multigraph?: boolean }): Dagre.Graph;
    graph(): { width: number, height: number };
    setEdge(sourceId: string, targetId: string, options: { [key: string]: any }, name: string): Graph;
  }
  interface GraphLib {
    Graph: Graph;
  }
}
declare var dagre: Dagre.DagreFactory;

/* Declaration for StackFrame */
interface StackFrame {
  functionName: string;
  lineNumber: number;
  columnNumber: number;
  source: string;
}


/* Extension of Snabbdom declaration */
interface VNode {
}

declare module "snabbdom" {
  export interface VNode {
  }
  export interface PatchFunction {
    (oldVNode: VNode | HTMLElement, vnode: VNode): VNode;
  }
}