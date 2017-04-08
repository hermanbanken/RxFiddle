import { jsonify } from "../../test/utils"
import { ICallRecord, ICallStart, callRecordType } from "./callrecord"
import { Event } from "./event"
import { Edge, EventLabel, Message, Node, NodeLabel, ObserverStorage, formatArguments } from "./logger"
import * as Rx from "rx"
import TypedGraph from "./typedgraph"
import { ObserverTree, ObservableTree, SubjectTree, IObservableTree, IObserverTree } from "../oct/oct"

type Group = {
  call: ICallStart
  id: number
  used: boolean
}

function isStream(v: Rx.Observable<any>): boolean {
  return v instanceof (Rx as any).Observable
}

export function isObserver<T>(v: any): v is Rx.Observer<T> & any {
  return typeof v === "object" && v !== null && typeof v.onNext === "function"
}

export function isDisposable(v: any): v is Rx.Subscription & any {
  return typeof v === "object" && v !== null && typeof v.dispose === "function"
}

export function isObservable<T>(v: any): v is Rx.Observable<T> {
  return typeof v === "object" && v !== null && typeof v.subscribe === "function"
}

export function isScheduler(v: any): v is Rx.IScheduler & any {
  return typeof v === "object" && v !== null && typeof v.now === "function" && typeof v.schedule === "function"
}

export function elvis(item: any, path: string[]): any[] {
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

export interface RxCollector {
  wrapHigherOrder<T>(subject: Rx.Observable<any>, fn: Function): (arg: T) => T
  before(record: ICallStart, parents?: ICallStart[]): this
  after(record: ICallRecord): void
  schedule(scheduler: Rx.IScheduler, method: string, action: Function, state: any): void
}

export default class NewCollector implements RxCollector {

  public static collectorId = 0
  public static reset() {
    this.collectorId = 0
  }

  public collectorId: number
  public hash: string

  public messages: Message[] = []
  public observerStorage: ObserverStorage = new ObserverStorage()
  private groups: Group[] = []
  private groupId: number = 0

  public constructor() {
    this.collectorId = NewCollector.collectorId++
    this.hash = this.collectorId ? `__hash${this.collectorId}` : "__hash"
  }

  public observerToObs(observer: number | any) {
    let oid = typeof observer === "number" ? observer : this.id(observer).get()
    return this.observerStorage.observerToObservable[oid]
  }

  public schedule(scheduler: Rx.IScheduler, method: string, action: Function, state: any): void {
    // throw new Error("Method not implemented.")
  }

  public before(record: ICallStart, parents?: ICallStart[]): this {
    this.tags(true, record.subject)
    this.tags(false, ...record.arguments)

    switch (callRecordType(record)) {
      case "setup":
        // Track group entry
        this.groups.slice(-1).forEach(g => g.used = true)
        this.groups.push({ call: record, id: this.groupId++, used: false })
        break
      case "subscribe":
      case "event":
        [].filter.call(record.arguments, isDisposable)
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
                  reason: "before/event/if(sub.parent): " + jsonify(record),
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
              let ps = [].filter.call(record.parent.arguments, isDisposable)
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
                      reason: "before/event/if(record.parent): " + jsonify(record),
                      v: Math.min(this.observerToObs(sub), this.observerToObs(sink)),
                      w: Math.max(this.observerToObs(sub), this.observerToObs(sink)),
                      // v: this.observerToObs(sink),
                      // w: this.observerToObs(sub),
                    },
                    id: this.messages.length,
                    type: "edge",
                  })
                })
              }
            }
          })

        let event = Event.fromRecord(record, { clocks: { tick: record.tick }, scheduler: "tick" })
        if (event && event.type === "subscribe" || typeof event === "undefined") {
          break
        }
        let sub = this.findRootObserverId(record.subject)
        // Prevent adding the same event for multiple wrapped Subscribers
        if (record.parent && sub === this.findRootObserverId(record.parent.subject)) {
          break
        }
        let e: NodeLabel = {
          label: {
            event,
            subscription: sub,
            type: "event",
          } as EventLabel,
          node: this.observerToObs(sub),
          type: "label",
        }
        this.messages.push(e)
      default:
    }

    return this
  }

  public after(record: ICallRecord): void {
    this.tags(false, record.returned)

    switch (callRecordType(record)) {
      case "setup":
        let group: Group = this.groups.pop()
        if (!isObservable(record.returned)) {
          break
        }

        let observable: number = this.id(record.returned).get()
        let observableSources: number[] = [record.subject/*, ...record.arguments*/]
          .filter(v => isObservable(v) && !isDisposable(v))
          .map(v => this.id(v).get())

        this.messages.push({
          group: group.used ? group.id : undefined,
          groups: this.groups.map(g => g.id),
          label: {
            args: formatArguments(record.arguments),
            method: record.method,
            type: "observable",
          },
          node: observable,
          type: "label",
        } as NodeLabel)

        if (record.returned.constructor.name === "FlatMapObservable") {
          console.log("FlatMapObservable", observableSources, observable, record)
        }

        this.messages.push(...observableSources.map(source => ({
          edge: {
            label: {
              time: record.time,
              type: "observable link",
            },
            reason: `after/setup: ${record.method}` + jsonify(record),
            v: source,
            w: observable,
          },
          group: group.used ? group.id : undefined,
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
      // tslint:disable-next-line:only-arrow-functions
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

  private tags(addContext: boolean, ...items: any[]): void {
    items.forEach(item => {
      if (typeof item !== "object") { return }
      if (isDisposable(item) || isObservable(item)) {
        // Find in structure
        if (isDisposable(item) && isDisposable(item.observer)) {
          this.tags(false, item.observer)
        }
        this.id(item).getOrSet(() => {
          let id = this.messages.length
          if (isObservable(item) || isDisposable(item)) {
            this.messages.push({
              id,
              node: {
                name: item.constructor.name || jsonify(item),
              },
              type: "node",
            } as Node)

            if (isObservable(item.source) && addContext) {
              this.messages.push({
                groups: this.groups.map(g => g.id),
                label: {
                  args: undefined,
                  method: undefined,
                  type: "observable",
                },
                node: id,
                type: "label",
              } as NodeLabel, {
                edge: {
                  label: {
                    time: undefined,
                    type: "observable link",
                  },
                  v: this.id(item.source).get(),
                  w: id,
                },
                groups: this.groups.map(g => g.id),
                type: "edge",
              } as Edge)
            }
          }
          return id
        })
      }
    })
  }

  private id<T>(obs: T) {
    return {
      get: () => typeof obs !== "undefined" && obs !== null ? (obs as any)[this.hash] : undefined,
      getOrSet: (orSet: () => number) => {
        if (typeof (obs as any)[this.hash] === "undefined") {
          (obs as any)[this.hash] = orSet()
        }
        return (obs as any)[this.hash]
      },
      set: (n: number) => (obs as any)[this.hash] = n,
    }
  }

  private findRootObserverId<T>(observer: any) {
    if (typeof observer === "object" && observer.observer) {
      return this.id(observer.observer).get()
    } else {
      return this.id(observer).get()
    }
  }
}
