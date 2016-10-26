import "../utils";
import { RxFiddleNode } from "./node";
import { RxFiddleEdge } from "./edge";
import { IEvent, Event, Subscribe, Next, Error as ErrorEvent, Complete } from "./event";
import { ICallRecord, callRecordType } from "./callrecord";
import * as Rx from "rx";
import * as dagre from "dagre";
import * as snabbdom from "snabbdom";
import { VNode } from "snabbdom";

const ErrorStackParser = require("error-stack-parser");
const h = require("snabbdom/h");
const patch = snabbdom.init([
  require("snabbdom/modules/attributes"),
  require("snabbdom/modules/eventlisteners"),
]);

const svgPanZoom = typeof window != "undefined" ? require("svg-pan-zoom") : {};

function isStream(v: Rx.Observable<any>): boolean {
  return v instanceof (<any>Rx)["Observable"];
}

export const HASH = "__hash"
export const OBSERVABLE_ID = "__observableID"
export const IGNORE = "__ignore"

// Expose protected properties of Observers
declare module "rx" {
  export interface Observable<T> { }
  export interface Observer<T> {
    source?: Observable<any>
    o?: Observer<any>
  }
}

export type MethodName = string;

export class AddStackFrame {
  public id: number
  public stackframe: StackFrame
}

export class AddObservable {
  public id: number
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

export interface ISubscriptionLens<T> {
  events(): IEvent[]
  nexts(): Next<T>[]
  completes(): Complete[]
  errors(): ErrorEvent[]
  all(): AddSubscription[]
}

export interface IObservableLens<T> {
  subscriptions(): ISubscriptionLens<T>
  all(): AddObservable[]
}

export interface ILens<T> {
  find(selector: string | number): IObservableLens<T>
}

export interface RxCollector {
  logSetup(
    from: Rx.Observable<any> | Rx.ObservableStatic, to: Rx.Observable<any>,
    using: [MethodName, StackFrame]): void
  logSubscribe(on: Rx.Observable<any>, observer: Rx.Observer<any>, destination?: Rx.Observable<any>): void
  logEvent(observer: Rx.Observer<any>, event: IEvent): void
  logLink(root: Rx.Observable<any>, child: Rx.Observable<any>): void
  wrapHigherOrder<T>(subject: Rx.Observable<any>, fn: Function): (arg: T) => T
}

export default class Collector implements RxCollector {

  public static collectorId = 0
  public collectorId: number
  public hash: string
  private queue: ICallRecord[] = []

  public static reset() {
    this.collectorId = 0
  }

  public indices = {
    stackframes: {} as { [source: string]: number },
  }

  public constructor() {
    this.collectorId = Collector.collectorId++
    this.hash = this.collectorId ? `__hash${this.collectorId}` : "__hash"
  }

  public lens<T>(): ILens<T> {
    return {
      find: (selector) => {
        let obs = () => this.data.filter(e =>
          e instanceof AddObservable &&
          (e.method === selector || e.id === selector)
        ) as AddObservable[]

        let subs = () => {
          let obsIds = obs().map(o => (<AddObservable>o).id)
          return this.data.filter(e =>
            e instanceof AddSubscription &&
            obsIds.indexOf(e.observableId) >= 0
          ) as AddSubscription[]
        }

        let events = () => {
          let subsIds = subs().map(s => s.id)
          return (this.data.filter(e =>
            e instanceof AddEvent &&
            subsIds.indexOf(e.subscription) >= 0
          ) as AddEvent[]).map(e => e.event)
        }

        return {
          all: () => obs(),
          subscriptions: () => ({
            all: () => subs(),
            completes: () => events().filter(e => e.type === "complete"),
            errors: () => events().filter(e => e.type === "error"),
            events,
            nexts: () => events().filter(e => e.type === "next"),
          }),
        } as IObservableLens<T>
      },
    }
  }

  public stackFrame(record: ICallRecord): number {
    if (typeof record === "undefined") {
      return undefined
    }
    // Code Location
    let stack = ErrorStackParser.parse(record).slice(1, 2)[0]
    let id = this.indices.stackframes[stack]
    if (typeof id === "undefined") {
      this.indices.stackframes[stack] = id = this.data.length
      this.data.push({
        id,
        stackframe: stack,
      })
    }
    return id
  }

  public observable(obs: Rx.Observable<any>, record?: ICallRecord): number {
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

      let parents = [record.subject].concat(record.arguments)
        .filter(isStream)
        .map((arg) => this.observable(arg))
      node.parents = parents
      return node.id
    }))
  }

  public observer(obs: Rx.Observer<any>, observable: Rx.Observable<any>): number {
    return this.id(obs).getOrSet(() => {
      let id = this.data.length
      let node = new AddSubscription()
      this.data.push(node)
      node.id = id
      node.observableId = this.observable(observable)
      return id
    })
  }

  public id<T>(obs: T) {
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

  public data: (AddStackFrame | AddObservable | AddSubscription | AddEvent | AddLink)[] = []

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
        if (record.subject && observer) {
          this.logSubscribe(record.subject, observer, observer.source || observer.parent)
        }
      }

      // fallthrough on purpose
      case "event":
        let event = Event.fromRecord(record)
        if (event) {
          this.logEvent(record.subject, event)
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

  public logSetup(onto: Rx.Observable<any> | null, to: Rx.Observable<any>, using: [MethodName, StackFrame]) { return }

  public logSubscribe(on: Rx.Observable<any>, observer: Rx.Observer<any>, destination?: Rx.Observable<any>) {
    this.observer(observer, on)
  }

  public logEvent(observer: Rx.Observer<any>, event: IEvent) {
    if (event.type === "subscribe") { return }
    let oid = this.id(observer).get()
    if (typeof oid !== "undefined") {
      let node = new AddEvent()
      node.event = event
      node.subscription = oid
      this.data.push(node)
    }
  }

  public logLink(root: Rx.Observable<any>, child: Rx.Observable<any>) {
    let link = new AddLink()
    link.sinkSubscription = this.observable(root)
    link.sourceSubscription = this.observable(child)
    this.data.push(link)
  }

  public wrapHigherOrder(subject: Rx.Observable<any>, fn: Function | any): Function | any {
    let self = this
    if (typeof fn === "function") {
      return function wrapper(val: any, id: any, subjectSuspect: Rx.Observable<any>) {
        let result = fn.apply(this, arguments)
        if (typeof result === "object" && isStream(result) && subjectSuspect) {
          self.logLink(subjectSuspect, result)
        }
        return result
      }
    }
    return fn
  }
}
