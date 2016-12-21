import { StackFrame } from "../utils"
import { ICallRecord, callRecordType } from "./callrecord"
import { Event, IEvent } from "./event"
import { ILens, lens } from "./lens"
import * as Rx from "rx"

const ErrorStackParser = require("error-stack-parser")

function isStream(v: Rx.Observable<any>): boolean {
  return v instanceof (<any>Rx).Observable
}

export function instanceAddSubscription(input: any) {
  return typeof input !== "undefined" && "observableId" in input && "id" in input
}

function guessing<T>(value: T, ...args: any[]): T {
  console.warn("Guessed", value, ".", ...args)
  return value
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
  public id: number
  public stackframe: StackFrame
  public parent: number
}

export class AddObservable {
  public id: number
  public callParent?: number
  public parents?: number[]
  public method?: string
  public stack?: number
  public arguments?: IArguments

  public inspect(depth: number, opts?: any): string {
    return `AddObservable(${this.method || this.constructor.name}, id: ${this.id})`
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

  public inspect(depth: number, opts?: any): string {
    return `AddSubscription(${this.observableId}, sinks: ${this.sinks}, scope: ${this.scopeId})`
  }
  public toString() {
    return this.inspect(0)
  }
}

export interface AddSubscription {
  id: number
  observableId: number
  sinks?: number[]
  scopeId?: number
}

export class AddEvent {
  public subscription: number
  public event: IEvent
}

export interface RxCollector {
  before(record: ICallRecord, parents?: ICallRecord[]): Collector
  after(record: ICallRecord): void
  wrapHigherOrder<T>(subject: Rx.Observable<any>, fn: Function): (arg: T) => T
}

export interface ICollector {
  data: (AddStackFrame | AddObservable | AddSubscription | AddEvent)[]
  indices: {
    observables: { [id: number]: { childs: number[], subscriptions: number[] } },
    stackframes: { [source: string]: number },
    subscriptions: { [id: number]: { events: number[], scoping: number[] } },
  }
  length: number
  getLog(id: number): AddObservable | AddSubscription | AddEvent | AddStackFrame
  getStack(id: number): AddStackFrame | null
  getObservable(id: number): AddObservable | null
  getSubscription(id: number): AddSubscription | null
  getEvent(id: number): AddEvent | null
}

export default class Collector implements RxCollector, ICollector {

  public static collectorId = 0
  public static reset() {
    this.collectorId = 0
  }

  public collectorId: number
  public hash: string

  public indices = {
    observables: {} as { [id: number]: { childs: number[], subscriptions: number[], inner: number[] } },
    stackframes: {} as { [source: string]: number },
    subscriptions: {} as { [id: number]: { events: number[], scoping: number[] } },
  }

  public data: (AddStackFrame | AddObservable | AddSubscription | AddEvent)[] = []

  private queue: ICallRecord[] = []

  public constructor() {
    this.collectorId = Collector.collectorId++
    this.hash = this.collectorId ? `__hash${this.collectorId}` : "__hash"
  }

  public lens(): ILens<{}> {
    return lens(this)
  }

  public before(record: ICallRecord, parents?: ICallRecord[]): Collector {
    this.queue.push(record)
    return this
  }

  public after(record: ICallRecord) {

    // Trampoline
    if (this.queue[0] === record) {
      this.queue.shift()
    } else if (this.queue.length > 0) {
      return
    }

    switch (callRecordType(record)) {
      case "setup": {
        this.observable(record.returned, record)
        break
      }

      case "subscribe": {
        let sinkSubscriber: AddSubscription = ascendingFind(record.arguments[0], (o) => {
          return this.getSubscription(this.id(o).get()) && true || false
        })

        new Array(record.returned).filter(o => typeof o === "object").forEach((observer) => {
          // Add higher order links, recording upstream nested 
          // observables (eg flatMap's inner FlatMapObservable)
          let scopeId = undefined
          if (record.subject.isScoped) {
            let found = ascendingFind(record.arguments[0], (o) => {
              return this.observableForObserver(o) && true
            })
            scopeId = this.id(found).get()
          }

          if (observer && record.subject) {
            // log subscribe
            let subid = this.subscription(observer, record.subject, scopeId, sinkSubscriber)
            // indices
            if (typeof scopeId !== "undefined") {
              this.indices.subscriptions[scopeId].scoping.push(subid)
            }
          }
        })
      }
        break

      case "event":
        let sid = this.id(record.subject).get()

        let event = Event.fromRecord(record)
        if (event && event.type === "subscribe" || typeof event === "undefined") {
          return
        }

        if (typeof sid !== "undefined") {
          let node = new AddEvent()
          node.event = event
          node.subscription = sid
          this.data.push(node)
          let index = this.indices.subscriptions[sid]
          if (typeof index === "undefined") {
            index = this.indices.subscriptions[sid] = { events: [], scoping: [] }
          }
          index.events.push(this.data.length - 1)
        } else {
          if (record.method === "dispose") {
            // console.log("ignored event", record.method, record.subject)
          }

        }
        break

      default:
        throw new Error("unreachable")
    }

    // Run trampoline
    if (this.queue.length) {
      this.queue.splice(0, this.queue.length).forEach(this.after.bind(this))
    }
  }

  public get length() {
    return this.data.length
  }

  public getLog(id: number): AddObservable | AddSubscription | AddEvent | AddStackFrame {
    return this.data[id]
  }

  public getObservable(id: number): AddObservable | null {
    let node = this.data[id]
    if (node instanceof AddObservable) { return node }
  }

  public getSubscription(id: number): AddSubscription | null {
    let node = this.data[id]
    if (instanceAddSubscription(node)) { return node as AddSubscription }
  }

  public getStack(id: number): AddStackFrame | null {
    let node = this.data[id]
    if (node instanceof AddStackFrame) { return node }
  }

  public getEvent(id: number): AddEvent | null {
    let node = this.data[id]
    if (node instanceof AddEvent) { return node }
  }

  public wrapHigherOrder(subject: Rx.Observable<any>, fn: Function | any): Function | any {
    let self = this
    if (typeof fn === "function") {
      return function wrapper(val: any, id: any, subjectSuspect: Rx.Observable<any>) {
        let result = fn.apply(this, arguments)
        if (typeof result === "object" && isStream(result) && subjectSuspect) {
          return self.proxy(result)
        }
        return result
      }
    }
    return fn
  }

  private pretty(o: Rx.Observable<any> | Rx.Observer<any> | any): string {
    let id = this.id(o).get()
    if (typeof id !== "undefined") {
      let node = this.data[id]
      if (instanceAddSubscription(node)) {
        let obs = this.getObservable((node as AddSubscription).observableId)
        return `${o.constructor.name}(${id}, observable: ${obs})`
      }
      if (node instanceof AddEvent) {
        let oid = this.getSubscription(node.subscription).observableId
        return `${node.event.type}(subscription: ${node.subscription}, observable: ${oid})`
      }
      if (node instanceof AddObservable) {
        return `${o.constructor.name}(${id})`
      }
    }
    return `anonymous ${o.constructor.name}`
  }

  private proxy<T>(target: T): T {
    return new Proxy(target, {
      get: (obj: any, name: string) => {
        if (name === "isScoped") { return true }
        return obj[name]
      },
    })
  }

  private stackFrame(record: ICallRecord): number {
    if (typeof record === "undefined" || typeof record.stack === "undefined") {
      return undefined
    }
    // Code Location
    let parsed = ErrorStackParser.parse(record)
    return parsed.slice(1, 3).reduceRight((prev: number, stack: StackFrame) => {
      let id = this.indices.stackframes[stack.source]
      if (typeof id === "undefined") {
        this.indices.stackframes[stack.source] = id = this.data.length
        let node = new AddStackFrame()
        node.id = id
        node.stackframe = stack
        node.parent = prev
        this.data.push(node)
      }
      return id
    }, undefined)
  }

  private observableForObserver(observer: Rx.Observer<any>): AddObservable  | undefined {
    let id = this.id(observer).get()
    if (typeof id === "undefined") { return }
    let node = this.getSubscription(id)
    let obs = node && this.getObservable(node.observableId) || undefined
    return obs
  }

  private enrichWithCall(node: AddObservable, record: ICallRecord, observable: Rx.Observable<any>) {
    if (typeof node.method !== "undefined") {
      return
    }
    node.stack = this.stackFrame(record)
    node.arguments = record && record.arguments
    node.method = record && record.method || observable.constructor.name

    // Add call-parent
    if (record && record.parent && record.subject === record.parent.subject) {
      node.callParent = this.id(record.parent.returned).get()
    }

    let parents = [record && record.subject].concat(record && record.arguments)
      .filter(isStream)
      .map((arg) => this.observable(arg))
    node.parents = parents

    this.indices.observables[node.id] = { childs: [], inner: [], subscriptions: [] }
    parents.forEach(parent => {
      let index = this.indices.observables[parent]
      if (typeof index !== "undefined") {
        index.childs.push(node.id)
      }
    })
  }

  private observable(obs: Rx.Observable<any>, record?: ICallRecord): number {
    let existingId = this.id(obs).get()
    if (
      typeof record !== "undefined" &&
      typeof existingId !== "undefined" &&
      typeof this.data[existingId] !== "undefined"
    ) {
      this.enrichWithCall(this.getObservable(existingId), record, obs)
    }

    // ensure all dependencies are tagged
    [record && record.subject].concat(record && record.arguments)
      .filter(isStream)
      .map((arg) => this.observable(arg))

    return (this.id(obs).getOrSet(() => {
      // if (typeof record !== "undefined") {
      let node = new AddObservable()
      node.id = this.data.length
      node.parents = []
      this.data.push(node)
      this.enrichWithCall(node, record, obs)
      return node.id
      // }
    }))
  }

  /**
   * AnonymousObservable uses AnonymousObserver to subscribe, which does not list its sinks.
   * We can guess though, that the previously created observer is the sink 
   */
  private heuristicallyGetSinkSubscribers() {
    if (this.getSubscription(this.data.length - 1)) {
      return [guessing(
        this.data.length - 1,
        "No sink Observer found, using previous Observer as most probable sink.",
      )]
    }
    return []
  }

  private subscription(
    sub: Rx.Observer<any>,
    observable: Rx.Observable<any>,
    scopeId?: number,
    sink?: AddSubscription
  ): number {
    let obsId = this.observable(observable)
    let create = (id: number) => {
      let sinks = sink ? [this.id(sink).get()] : this.heuristicallyGetSinkSubscribers()
      let node = new AddSubscriptionImpl()
      this.data.push(node)
      node.id = id
      node.sinks = sinks
      node.observableId = obsId
      if (typeof scopeId !== "undefined") {
        node.scopeId = scopeId
      }

      this.indices.subscriptions[id] = { events: [], scoping: [] }
      let index = this.indices.observables[node.observableId]
      if (typeof index !== "undefined") {
        index.subscriptions.push(id)
      }

    }

    // if (typeof (<any>observable).onNext !== "undefined") {
    //   console.warn("subject!!!", sub, observable)
    // }
    // let maybeSubject: AddObservable = this.getObservable(this.id(sub).get())
    // if (typeof maybeSubject !== "undefined") {
    //   console.warn("subject!!!")
    //   let id = this.id(sub).get()
    //   let node = create(id)
    //   Object.assign(this.data[id], node)
    //   return this.id(sub).get()
    // }
    return this.id(sub).getOrSet(() => {
      let id = this.data.length
      create(id)
      return id
    })
  }

  private id<T>(obs: T) {
    return {
      get: () => typeof obs !== "undefined" && obs !== null ? (<any>obs)[this.hash] : undefined,
      getOrSet: (orSet: () => number) => {
        if (typeof (<any>obs)[this.hash] === "undefined") {
          (<any>obs)[this.hash] = orSet()
        }
        return (<any>obs)[this.hash]
      },
      set: (n: number) => (<any>obs)[this.hash] = n,
    }
  }
}
