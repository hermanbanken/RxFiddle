import "../utils"
import { ICallRecord, callRecordType } from "./callrecord"
import { Event, IEvent } from "./event"
import { ILens, lens } from "./lens"
import * as Rx from "rx"

const ErrorStackParser = require("error-stack-parser")

function isStream(v: Rx.Observable<any>): boolean {
  return v instanceof (<any>Rx).Observable
}

// Expose protected properties of Observers
declare module "rx" {
  export interface Observable<T> { }
  export interface Observer<T> {
    source?: Observable<any>
    o?: Observer<any>
  }
}

export class AddStackFrame {
  public id: number
  public stackframe: StackFrame
}

export class AddObservable {
  public id: number
  public callParent?: number
  public parents?: number[]
  public method?: string
  public stack?: number
  public arguments?: IArguments
}

export class AddSubscription {
  public id: number
  public observableId: number
}

export class AddEvent {
  public subscription: number
  public event: IEvent
}

export class AddLink {
  public sourceSubscription: number
  public sinkSubscription: number
}

export interface RxCollector {
  before(record: ICallRecord, parents?: ICallRecord[]): Collector
  after(record: ICallRecord): void
  wrapHigherOrder<T>(subject: Rx.Observable<any>, fn: Function): (arg: T) => T
}

export interface ICollector {
  data: (AddStackFrame | AddObservable | AddSubscription | AddEvent | AddLink)[]
  indices: {
    observables: { [id: number]: { childs: number[], subscriptions: number[] } },
    stackframes: { [source: string]: number },
    subscriptions: { [id: number]: { events: number[], links: number[] } },
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
    observables: {} as { [id: number]: { childs: number[], subscriptions: number[] } },
    stackframes: {} as { [source: string]: number },
    subscriptions: {} as { [id: number]: { events: number[], links: number[] } },
  }

  public data: (AddStackFrame | AddObservable | AddSubscription | AddEvent | AddLink)[] = []

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
    } else if (this.queue.length > 1) {
      return
    }

    switch (callRecordType(record)) {
      case "setup": {
        this.observable(record.returned, record)
        break
      }

      case "subscribe": {
        let observer = record.arguments[0] && typeof record.arguments[0] === "object" ?
          record.arguments[0] as Rx.Observer<any> :
          record.returned
        if (observer && record.subject) {
          this.subscription(observer, record.subject)
        }
      }

      // fallthrough on purpose
      case "event":
        let event = Event.fromRecord(record)
        if (event && event.type !== "subscribe") {
          let oid = this.id(record.subject).get()
          if (typeof oid !== "undefined") {
            let node = new AddEvent()
            node.event = event
            node.subscription = oid
            this.data.push(node)
            this.indices.subscriptions[oid].events.push(this.data.length - 1)
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

  public wrapHigherOrder(subject: Rx.Observable<any>, fn: Function | any): Function | any {
    let self = this
    if (typeof fn === "function") {
      return function wrapper(val: any, id: any, subjectSuspect: Rx.Observable<any>) {
        let result = fn.apply(this, arguments)
        if (typeof result === "object" && isStream(result) && subjectSuspect) {
          self.link(subjectSuspect, result)
        }
        return result
      }
    }
    return fn
  }

  private stackFrame(record: ICallRecord): number {
    if (typeof record === "undefined" || typeof record.stack === "undefined") {
      return undefined
    }
    // Code Location
    let stack = ErrorStackParser.parse(record).slice(1, 2)[0]
    let id = this.indices.stackframes[stack]
    if (typeof id === "undefined") {
      this.indices.stackframes[stack] = id = this.data.length
      let node = new AddStackFrame()
      node.id = id
      node.stackframe = stack
      this.data.push(node)
    }
    return id
  }

  private observable(obs: Rx.Observable<any>, record?: ICallRecord): number {
    return (this.id(obs).getOrSet(() => {
      if (typeof record === "undefined") {
        return undefined
      }

      let node = new AddObservable()
      node.stack = this.stackFrame(record)
      node.id = this.data.length
      this.data.push(node)
      node.arguments = record && record.arguments
      node.method = record && record.method

      // Add call-parent
      if (record.parent && record.subject === record.parent.subject) {
        node.callParent = this.id(record.parent.returned).get()
      }

      let parents = [record.subject].concat(record.arguments)
        .filter(isStream)
        .map((arg) => this.observable(arg))
      node.parents = parents

      this.indices.observables[node.id] = { childs: [], subscriptions: [] }
      parents.forEach(parent => {
        let index = this.indices.observables[parent]
        if (typeof index !== "undefined") {
          index.childs.push(node.id)
        }
      })

      return node.id
    }))
  }

  private subscription(sub: Rx.Observer<any>, observable: Rx.Observable<any>): number {
    return this.id(sub).getOrSet(() => {
      let id = this.data.length
      let node = new AddSubscription()
      this.data.push(node)
      node.id = id
      node.observableId = this.observable(observable)

      this.indices.subscriptions[id] = { events: [], links: [] }
      let index = this.indices.observables[node.observableId]
      if (typeof index !== "undefined") {
        index.subscriptions.push(id)
      }

      return id
    })
  }

  private id<T>(obs: T) {
    return {
      get: () => (<any>obs)[this.hash],
      getOrSet: (orSet: () => number) => {
        if (typeof (<any>obs)[this.hash] === "undefined") {
          (<any>obs)[this.hash] = orSet()
        }
        return (<any>obs)[this.hash]
      },
      set: (n: number) => (<any>obs)[this.hash] = n,
    }
  }

  private link(root: Rx.Observable<any>, child: Rx.Observable<any>) {
    let link = new AddLink()
    link.sinkSubscription = this.observable(root)
    link.sourceSubscription = this.observable(child)
    this.data.push(link)

    let index = this.indices.subscriptions[link.sourceSubscription]
    if (typeof index !== "undefined") {
      index.links.push(link.sinkSubscription)
    }
  }
}
