import { EdgeType, ISchedulerInfo, ITreeLogger, NodeType } from "../oct/oct"
import { IEvent } from "./event"

export default class Logger implements ITreeLogger {
  // tslint:disable-next-line:no-constructor-vars
  constructor(private post: (m: any) => void) {}
  public addNode(id: string, type: NodeType, scheduler?: ISchedulerInfo): void {
    this.post({ id, type, scheduler })
  }
  public addMeta(id: string, meta: any): void {
    this.post({ id, meta })
  }
  public addEdge(v: string, w: string, type: EdgeType, meta?: any): void {
    this.post({ v, w, type, meta })
  }
  public addScheduler(id: string, scheduler: ISchedulerInfo): void {
    this.post({ id, scheduler })
  }
  public addContraction(id: string, nodes: string[]): void {
    this.post({ id, contract: nodes })
  }
  public reset() {
    this.post("reset")
  }
}

export function formatObject(o: any, levels: number = 2, depth: number = 0): string {
  if (o === null) { return "null" }
  if (levels <= 0) {
    return `${
      o.constructor && o.constructor.name !== "Object" ?
        `[${o.constructor.name}] ` :
        ""
      }{...}`
  }

  let result = `${o.constructor.name !== "Object" ? `[${o.constructor.name}] ` : ""}{`
  let i = 0
  for (let key in o) {
    if (o.hasOwnProperty(key) && key[0] !== "_") {
      if (i > 0) { result += "," }
      i++
      let padding = ""
      for (let p = 0; p < depth; p++) { padding += "  " }
      result += `\n${padding}"${key}": ${_formatArguments([o[key]], levels - 1, depth + 1)}`
    }
  }
  result += result[result.length - 1] === "{" ? "}" : "\n}"
  return result
}

function _formatArguments(args: IArguments | any[], levels: number = 2, depth: number = 0): string {
  return [].map.call(args, (a: any) => {
    switch (typeof a) {
      case "undefined": return "undefined"
      case "object":
        if (Array.isArray(a)) {
          return `[${_formatArguments(a, levels - 1, depth + 1)}]`
        } else {
          return formatObject(a, levels - 1, depth + 1)
        }
      case "function":
        if (typeof a.__original === "function") {
          return a.__original.toString()
        }
        if (typeof a.__originalFunction === "function") {
          return a.__originalFunction.toString()
        }
        return a.toString()
      case "string":
        return `"${a.substring(0, 512)}"`
      case "boolean":
        return a.toString()
      case "number":
        return a
      default: throw new TypeError(`Invalid type ${typeof a}`)
    }
  }).join(", ")
}

export function formatArguments(args: IArguments | any[]): string {
  return _formatArguments(args)
}

export type Node = {
  id: number
  type: "node"
  node: {
    name: string
  }
}
export type Edge = {
  type: "edge"
  edge: {
    v: number
    w: number
    label: SubscriptionLinkLabel | SubscriptionHigherOrderLinkLabel | ObservableTimingLabel,
    reason: string
  }
  group?: number
  groups?: number[]
}

export type NodeLabel = {
  group?: number
  groups?: number[]
  type: "label"
  label: SubcriptionLabel | ObservableLabel | EventLabel
  node: number
}

export type ObservableTimingLabel = {
  time: number
  type: "observable link"
}

export type SubcriptionLabel = {
  id: number
  type: "subscription"
}

export type SubscriptionLinkLabel = {
  type: "subscription sink"
  v: number
  w: number
}

export type SubscriptionHigherOrderLinkLabel = {
  type: "higherOrderSubscription sink",
  id: number
  parent: number
}

export type EventLabel = {
  event: IEvent
  subscription: number
  type: "event"
}

export type ObservableLabel = {
  args: any
  method: string
  type: "observable"
}

export type Message = Node | Edge | NodeLabel
