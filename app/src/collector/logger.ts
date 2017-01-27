import { StackFrame } from "../utils"
import { ICallRecord, ICallStart, callRecordType } from "./callrecord"
import { Event, IEvent } from "./event"
import { ILens, lens } from "./lens"
import * as Rx from "rx"

const ErrorStackParser = require("error-stack-parser")

function isStream(v: Rx.Observable<any>): boolean {
  return v instanceof (<any>Rx).Observable
}

function isSubscription(v: any): boolean {
  return typeof v === "object" && v !== null && typeof v.dispose === "function"
}

function isObservable(v: any): boolean {
  return typeof v === "object" && v !== null && typeof v.subscribe === "function"
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
        return a.substring(0, 512)
      case "number":
        return a
      default: throw new TypeError(`Invalid type ${typeof a}`)
    }
  }).join(", ")
}

function last<T>(list: T[]): T {
  return list.length >= 1 ? list[list.length - 1] : undefined
}
function head<T>(list: T[]): T {
  return list.length >= 1 ? list[0] : undefined
}

function elvis(item: any, path: string[]): any[] {
  let next = typeof item === "object" && path.length && path[0] in item ? item[path[0]] : undefined
  if (path.length > 1) {
    return elvis(next, path.slice(1))
  } else if (typeof next !== "undefined") {
    return [next]
  } else {
    return []
  }
}

function keys<T, K extends keyof T>(obj: T): K[] {
  return Object.keys(obj) as any as K[]
}

function numkeys<T>(obj: { [id: number]: T }): number[] {
  return Object.keys(obj)
    .map(v => typeof v === "number" ? v : parseInt(v, 10))
    .filter(v => !isNaN(v)) as any as number[]
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
  data: All[]
  indices: {
    observables: { [id: number]: { childs: number[], subscriptions: number[] } },
    stackframes: { [source: string]: number },
    subscriptions: { [id: number]: { events: number[], scoping: number[] } },
  }
  length: number
  getLog(id: number): All
  getStack(id: number): AddStackFrame | null
  getObservable(id: number): AddObservable | null
  getSubscription(id: number): AddSubscription | null
  getEvent(id: number): AddEvent | null
}

type Group = {
  call: ICallStart
  id: number
  used: boolean
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

function existsSomewhereIn(obj: any, search: any[]): string {
  let searched: any[] = []
  let depth = 0
  let toBeSearched = keys(obj).map(key => ({ key, value: obj[key] }))
  while (toBeSearched.length && depth++ < 3) {
    let found = toBeSearched.find(v => search.indexOf(v.value) >= 0)
    if (found) { return found.key }
    searched.push(...toBeSearched.map(pair => pair.value))
    toBeSearched = toBeSearched
      .filter(pair => typeof pair.value === "object" && pair.value !== null)
      .flatMap(p => keys(p.value).map(k => ({ key: p.key + "." + k, value: p.value[k] })))
      .filter(pair => searched.indexOf(pair.value) < 0)
  }
  return
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
    label: {}
  }
}
export type NodeLabel = {
  group?: number
  groups?: number[]
  type: "label"
  label: {}
  node: number
}

export type Message = Node | Edge | NodeLabel

export class NewCollector implements RxCollector {
  public collectorId = Collector.collectorId++
  public hash: string

  public messages: Message[] = []
  public observerStorage: ObserverStorage = new ObserverStorage()
  private groups: Group[] = []
  private groupId: number = 0

  public constructor() {
    this.collectorId = Collector.collectorId++
    this.hash = this.collectorId ? `__hash${this.collectorId}` : "__hash"
  }

  public observerToObs(observer: number | any) {
    let oid = typeof observer === "number" ? observer : this.id(observer).get()
    return this.observerStorage.observerToObservable[oid]
  }

  public before(record: ICallStart, parents?: ICallStart[]): this {
    this.tags(record.subject, ...record.arguments)

    switch (callRecordType(record)) {
      case "setup":
        // Track group entry
        this.groups.slice(-1).forEach(g => g.used = true)
        this.groups.push({ call: record, id: this.groupId++, used: false })
        break
      case "subscribe":
        [].filter.call(record.arguments, isSubscription)
          .forEach((sub: any) => {
            let set = this.observerStorage.set(this.id(record.subject).get(), this.id(sub).get())
            set.addCore(this.id(sub).get(), "1")

            // Add subscription label
            this.messages.push({
              label: {
                id: this.id(sub).get(),
                type: "subscription",
              },
              node: this.id(record.subject).get(),
              type: "label",
            })

            // Find higher order sink:
            // see if this sub has higher order sinks
            // TODO verify robustness of .parent & add other patterns
            if (sub.parent) {
              set.addRelation(this.id(sub.parent).get(), "3 higher sink")
              let parentObs = this.observerToObs(sub.parent)

              // Add subscription link
              this.messages.push({
                edge: {
                  label: {
                    id: this.id(sub).get(),
                    parent: this.id(sub.parent).get(),
                    type: "higherOrderSubscription sink",
                  },
                  v: this.id(record.subject).get(),
                  w: parentObs,
                },
                id: this.messages.length,
                type: "edge",
              })
            }

            // Find sink:
            // see if this sub links to record.parent.arguments.0 => link
            if (record.parent) {
              let ps = [].filter.call(record.parent.arguments, isSubscription)
              let key = existsSomewhereIn(sub, ps)
              if (key) {
                let sinks = elvis(sub, key.split("."))
                // console.log(
                //   record.subject.constructor.name, "-|>",
                //   sinks.map(v => v.constructor.name))
                sinks.forEach(sink => {
                  set.addRelation(this.id(sink).get(), "2 sink")
                  this.messages.push({
                    edge: {
                      label: {
                        type: "subscription sink",
                        v: this.id(sub).get(),
                        w: this.id(sink).get(),
                      },
                      v: this.observerToObs(sub),
                      w: this.observerToObs(sink),
                    },
                    id: this.messages.length,
                    type: "edge",
                  })
                })
              }
            }
          })
        break
      case "event":
        let event = Event.fromRecord(record)
        if (event && event.type === "subscribe" || typeof event === "undefined") {
          break
        }
        let e: Edge = {
          edge: { label: event, v: 0, w: 0 },
          type: "edge",
        }
        this.messages.push(e)
      default:
    }

    return this
  }

  public after(record: ICallRecord): void {
    this.tags(record.returned)

    switch (callRecordType(record)) {
      case "setup":
        let group = this.groups.pop()
        if (!isObservable(record.returned)) {
          break
        }

        let observable: number = this.id(record.returned).get()
        let observableSources: number[] = [record.subject, ...record.arguments]
          .filter(v => isObservable(v) && !isSubscription(v))
          .map(v => this.id(v).get())

        this.messages.push({
          group: group.used ? group.id : undefined,
          groups: this.groups.map(g => g.id),
          label: {
            args: formatArguments(record.arguments),
            kind: "observable",
            method: record.method,
          },
          node: observable,
          type: "label",
        } as NodeLabel)

        this.messages.push(...observableSources.map(source => ({
          edge: {
            label: {
              time: record.time,
            },
            v: source,
            w: observable,
          },
          groups: this.groups.map(g => g.id),
          type: "edge",
        } as Edge)))
        break

      case "subscribe":
        break
      default:
    }
    return
  }

  public wrapHigherOrder(subject: Rx.Observable<any>, fn: Function | any): Function | any {
    let self = this
    if (typeof fn === "function") {
      let wrap = function wrapper(val: any, id: any, subjectSuspect: Rx.Observable<any>) {
        let result = fn.apply(this, arguments)
        if (typeof result === "object" && isStream(result) && subjectSuspect) {
          return self.proxy(result)
        }
        return result
      };
      (wrap as any).__original = fn
      return wrap
    }
    return fn
  }

  private proxy<T>(target: T): T {
    return new Proxy(target, {
      get: (obj: any, name: string) => {
        if (name === "isScoped") { return true }
        return obj[name]
      },
    })
  }

  private tags(...items: any[]): void {
    items.forEach(item => {
      if (typeof item !== "object") { return }
      if (isSubscription(item) || isObservable(item)) {
        // Find in structure
        if (isSubscription(item) && isSubscription(item.observer)) {
          this.tags(item.observer)
        }
        this.id(item).getOrSet(() => {
          let id = this.messages.length
          if (isObservable(item)) {
            this.messages.push({
              id,
              node: {
                name: item.constructor.name || item.toString(),
              },
              type: "node",
            })
          }
          return id
        })
      }
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

  public data: All[] = []

  public allRecords: ICallStart[] = []
  public trace: any[] = []
  private queue: ICallStart[] = []

  private groups: Group[] = []

  public constructor() {
    this.collectorId = Collector.collectorId++
    this.hash = this.collectorId ? `__hash${this.collectorId}` : "__hash"
  }

  public lens(): ILens<{}> {
    return lens(this)
  }

  public before(record: ICallStart, parents?: ICallRecord[]): this {
    this.allRecords.push(record)
    this.queue.push(record)
    this.trace.push({
      groups: this.groups.map(g => g.call.method),
      kind: "before",
      method: record.method,
    })

    switch (callRecordType(record)) {
      case "setup": {
        // Track group entry
        this.groups.push({
          call: record,
          id: 0,
          used: false,
        })

        let item = new AddStructureEntry()
        item.id = this.data.length
        item.method = record.method
        item.parents = []
        if (typeof record.subject !== "undefined") {
          item.parents.push(this.observable(record.subject));
          // (item as any).subject = JSON.stringify(record.subject)
        }
        this.data.push(item)
        break
      }
      default: break
    }

    return this
  }

  public after(record: ICallRecord) {
    this.trace.push({
      kind: "after",
      method: record.method,
    })

    if (callRecordType(record) === "setup") {
      // Track group entry
      this.groups.pop()
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

        if (this.getObservable(sid)) {
          // console.log("Subject", this.getObservable(sid), "found", "subs:",
          //   this.data.filter(e => sid === (e as any).observableId))
          let subs = this.data.filter(e => sid === (e as any).observableId)
          if (subs.length === 1) {
            sid = (subs[0] as AddSubscription).id
          }
        }

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
  }

  public get length() {
    return this.data.length
  }

  public getLog(id: number): All {
    return this.data[id]
  }

  public getObservable(id: number): AddObservable | null {
    let node = this.data[id]
    if (node instanceof AddObservable) { return node }
  }

  public getSubscription(id: number): AddSubscription | null {
    let node = this.data[id]
    if (node && node.kind === "subscription") { return node as AddSubscription }
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

  private observableForObserver(observer: Rx.Observer<any>): AddObservable | undefined {
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
    if (record && record.parent) {
      // TODO reintroduce call-parent like thing
      // node.callParent = this.id(record.parent.returned).get()
    } else if (this.queue.length > 0) {
      // console.log("queue while processing", node.method, "\n", this.queue)
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
