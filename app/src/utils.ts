/* tslint:disable:no-namespace */
/* tslint:disable:interface-name */

/* Extension of Rx */
declare global {
  namespace Rx {
    interface Observable<T> { }
    interface Observer<T> {
      source?: Observable<any>
      o?: Observer<any>
    }
    interface ObservableStatic {
      prototype: any
    }
    interface IScheduler { }
    interface Subscription { }
  }
}

interface ObservableStatic {
  prototype: any
}

/* Get name of function */
export function getName(this: Function) {
  let funcNameRegex = /function (.{1,})\(/
  let results = (funcNameRegex).exec((this).constructor.toString())
  return (results && results.length > 1) ? results[1] : ""
}

export function UUID() {
  /** UUID generator: http://stackoverflow.com/a/2117523/552203 */
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    // tslint:disable:no-bitwise
    let r = Math.random() * 16 | 0
    let v = c === "x" ? r : (r & 0x3 | 0x8)
    return v.toString(16)
    // tslint:enable:no-bitwise
  })
}

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
