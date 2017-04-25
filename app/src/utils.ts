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

/* FlatMap extension of Array prototype */
declare global {
  interface Array<T> {
    flatMap<R>(f: (t: T, index: number, all: T[]) => R[]): Array<R>
  }
}
function flatMap<T, R>(f: (t: T, index: number, all: T[]) => R[]): R[] {
  return this.reduce((p: R[], n: T, index: number) => p.concat(f(n, index, this)), [])
}
Array.prototype.flatMap = flatMap

/* Extension of Object prototype */
declare global {
  interface Object {
    getName(): string
  }
}
function getName() {
  let funcNameRegex = /function (.{1,})\(/
  let results = (funcNameRegex).exec((this).constructor.toString())
  return (results && results.length > 1) ? results[1] : ""
}
(<any>Object.prototype).getName = getName

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

/* Declaration for StackFrame */
export interface StackFrame {
  functionName: string
  lineNumber: number
  columnNumber: number
  source: string
}

/* random */
export function endsWith(self: string, suffix: string): boolean {
  return self.indexOf(suffix, self.length - suffix.length) !== -1
}

export function last<T>(list: T[]): T {
  return list.length >= 1 ? list[list.length - 1] : undefined
}

export function head<T>(list: T[]): T {
  return list.length >= 1 ? list[0] : undefined
}

export function getPrototype(input: any): any {
  return input.protoype || input.__proto__
}
