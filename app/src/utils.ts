/* tslint:disable:no-namespace */
/* tslint:disable:interface-name */

// ucs-2 string to base64 encoded ascii
export function utoa(str: string) {
  return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) => {
    return String.fromCharCode("0x" + p1 as any)
  }))
}
// base64 encoded ascii to ucs-2 string
export function atou(str: string) {
  return decodeURIComponent(Array.prototype.map.call(atob(str), (c: string) => {
    return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
  }).join(""))
}

export declare let btoa: (inp: string) => string
if (typeof btoa !== "function") {
  btoa = function node_btoa(str: any) {
    let buffer
    if (str instanceof Buffer) {
      buffer = str
    } else {
      buffer = new Buffer(str.toString(), "binary")
    }
    return buffer.toString("base64")
  }
}

export declare let atob: (inp: string) => string
if (typeof atob !== "function") {
  atob = function node_atob(str: string) {
    return new Buffer(str, "base64").toString("binary")
  }
}

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
