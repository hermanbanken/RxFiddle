import { StackFrame } from "../utils"
import { ICallRecord, ICallStart } from "./callrecord"
import Collector from "./collector"
import { IEvent } from "./event"
import * as Rx from "rx"

export default Collector

function numkeys<T>(obj: { [id: number]: T }): number[] {
  return Object.keys(obj)
    .map(v => typeof v === "number" ? v : parseInt(v, 10))
    .filter(v => !isNaN(v)) as any as number[]
}

export function formatArguments(args: IArguments | any[]): string {
  return [].map.call(args, (a: any) => {
    switch (typeof a) {
      case "undefined": return "undefined"
      case "object":
        if (Array.isArray(a)) {
          return `[${formatArguments(a)}]`
        } else {
          return a.toString() === "[object Object]" ? `[object ${a.constructor.name}]` : a
        }
      case "function":
        if (typeof a.__original === "function") {
          return a.__original.toString()
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

export function instanceAddSubscription(input: any) {
  return typeof input !== "undefined" && "observableId" in input && "id" in input
}

interface IAscendResults {
  items: any[]
  ascend: () => IAscendResults
}

function ascend(obj: any | any[]): IAscendResults {
  let objs: any[] = Array.isArray(obj) ? obj : [obj]
  let items = objs.filter(o => o)
    .map(_ => Object.keys(_).map(key => _[key]))
    .reduce((list, n) => list.concat(n, []), [])
  return {
    items,
    ascend: () => ascend(items),
  }
}

function ascendingFind(target: any, test: (target: any) => boolean, maxLevel = 10): any | null {
  if (test(target)) { return target }
  let result: IAscendResults = ascend(target)
  let level = 0
  do {
    let finding = result.items.find(test)
    if (typeof finding !== "undefined") { return finding }
    result = result.ascend()
    level++
  } while (level < maxLevel)
}

// Expose protected properties of Observers
declare module "rx" {
  export interface Observable<T> {
    source?: Observable<any>
  }
  export interface Observer<T> {
    source?: Observable<any>
    o?: Observer<any>
    parent?: Observer<any>
  }
}

export class AddStackFrame {
  public kind: "stackframe"
  public id: number
  public stackframe: StackFrame
  public parent: number
}

export class AddStructureEntry {
  public kind: "observable"
  public id: number
  public parents?: number[]
  public method?: string
}

export class AddObservable {
  public kind: "observable"
  public id: number
  public callParent?: number
  public parents?: number[]
  public method?: string
  public stack?: number
  public arguments?: IArguments

  public inspect(depth: number, opts?: any): string {
    return `AddObservable(${this.method || this.constructor.name}, id: ${this.id}, parents: [${this.parents}])`
  }
  public toString() {
    return this.inspect(0)
  }
}

export class AddSubscriptionImpl implements AddSubscription {
  public id: number
  public observableId: number
  public sinks?: number[]
  public scopeId?: number
  public kind: "subscription"

  public inspect(depth: number, opts?: any): string {
    return `AddSubscription(${this.id}, 
      observable: ${this.observableId}, sinks: [${this.sinks}], scope: ${this.scopeId})`
  }
  public toString() {
    return this.inspect(0)
  }
}

export interface AddSubscription {
  kind: "subscription"
  id: number
  observableId: number
  sinks?: number[]
  scopeId?: number
}

export class AddEvent {
  public kind: "event"
  public subscription: number
  public event: IEvent
}

export interface RxCollector {
  before(record: ICallStart, parents?: ICallStart[]): this
  after(record: ICallRecord): void
  wrapHigherOrder<T>(subject: Rx.Observable<any>, fn: Function): (arg: T) => T
}

export type All = AddStackFrame | AddObservable | AddSubscription | AddEvent | AddStructureEntry

export interface ICollector {
}

export class ObserverSet {
  public observable: number
  public ids: number[] = []
  public relations: number[] = []
  public tags: { [id: number]: string[] } = {}
  constructor(observable: number) {
    this.observable = observable
  }

  public inspect(depth: number, opts?: any): string {
    let ts = depth > 0 ? numkeys(this.tags).map(v => {
      return this.tags[v] ? `\n\t${v}: ${this.tags[v].join(",")}` : v
    }) : "[..]"
    return `ObservableSet(o: ${this.observable}, [${this.ids}], ${ts})`
  }
  public toString() {
    return this.inspect(1)
  }
}

export class ObserverStorage {
  public sets: ObserverSet[] = []
  public observableToSets: { [id: number]: ObserverSet[] } = {}
  public observerToSet: { [id: number]: number } = {}
  public observerToObservable: { [id: number]: number } = {}

  public set(forObservable: number, forObserver: number) {
    let set: ObserverSet
    let setId: number

    if (typeof this.observerToSet[forObserver] !== "undefined") {
      setId = this.observerToSet[forObserver]
      set = this.sets[setId]
    } else {
      set = new ObserverSet(forObservable)
      this.observableToSets[forObservable] = (this.observableToSets[forObservable] || []).concat([set])
      setId = this.sets.push(set) - 1
    }

    function addTag(observer: number, tag: string) {
      if (typeof set.tags[observer] === "undefined") { set.tags[observer] = [] }
      if (set.tags[observer].indexOf(tag) < 0) {
        set.tags[observer].push(tag)
      }
    }

    return {
      addCore: (observer: number, ...tags: string[]) => {
        if (set.ids.indexOf(observer) < 0) { set.ids.push(observer) }
        tags.forEach(t => addTag(observer, t))
        this.observerToSet[observer] = setId
        this.observerToObservable[observer] = forObservable
      },
      addRelation: (observer: number, ...tags: string[]) => {
        if (set.relations.indexOf(observer) < 0) { set.relations.push(observer) }
        tags.forEach(t => addTag(observer, t))
      },
    }
  }
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
