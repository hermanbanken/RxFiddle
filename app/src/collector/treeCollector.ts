import { jsonify } from "../../test/utils"
import { ICallRecord, ICallStart, callRecordType } from "./callrecord"
import { Event } from "./event"
import { Edge, EventLabel, Message, Node, NodeLabel, ObserverStorage, formatArguments } from "./logger"
import * as Rx from "rx"
import TypedGraph from "./typedgraph"
import { ObserverTree, ObservableTree, SubjectTree, IObservableTree, IObserverTree } from "../oct/oct"
import { RxCollector, isObservable, isDisposable, isObserver, elvis } from "./collector"

export class TreeCollector implements RxCollector {
  public static collectorId = 0
  public hash: string
  public collectorId: number
  public all: (IObserverTree | IObservableTree)[] = []
  public nextId = 1
  public graph = new TypedGraph<(ObserverTree|ObservableTree),{}>()
  public stack: ICallStart[] = []
  
  private record: ICallStart
  
  public constructor() {
    this.collectorId = TreeCollector.collectorId++
    this.hash = this.collectorId ? `__thash${this.collectorId}` : "__thash"
  }

  public wrapHigherOrder(subject: Rx.Observable<any>, fn: Function | any): Function | any {
    let self = this
    if (typeof fn === "function") {
      // tslint:disable-next-line:only-arrow-functions
      let wrap = function wrapper(val: any, id: any, subjectSuspect: Rx.Observable<any>) {
        let result = fn.apply(this, arguments)
        if (typeof result === "object" && isObservable(result) && subjectSuspect) {
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

  public before(record: ICallStart, parents?: ICallStart[]): this {
    this.record = record
    this.stack.push(record)
    switch(callRecordType(record)) {
      case "subscribe":
        this.tagObservable(record);
        [].filter.call(record.arguments, isDisposable).forEach((s: any) => this.tagObserver(s))
        break;
      case "event":
        let event = Event.fromRecord(record)
        if(event && this.hasTag(record.subject)) {
          this.tagObserver(record.subject).forEach(_ => _.events.push(event))
        }
        break;
      case "setup":
        this.tagObservable(record.subject)
    }
    return this
  }

  public after(record: ICallRecord): void {
    switch(callRecordType(record)) {
      case "subscribe":
        if(record.subject.constructor.name === "Subject") {
          // console.log("onto subject", record.arguments[0])
        }
        let observers = [].filter.call(record.arguments, isObserver).slice(0, 1)
        observers.forEach((s: any) => this.tagObserver(s).forEach(observer => {
          let observable = this.tag(record.subject)
          if(observable instanceof SubjectTree) {
            // Special case for subjects
            observable.addSink(([observer]), " subject")
          } else if (observable instanceof ObservableTree) {
            observer.setObservable([observable])
          }
        }))
        break;
      case "setup":
        this.tagObservable(record.returned, record)
    }
    this.stack.pop()
  }

  private hasTag(input: any): boolean {
    return typeof (input as any)[this.hash] !== "undefined"
  }

  private tag(input: any): IObserverTree | IObservableTree | undefined {
    let tree: IObserverTree | IObservableTree
    if(typeof (input as any)[this.hash] !== "undefined") {
      return (input as any)[this.hash]
    }

    if(isObserver(input) && isObservable(input)) {
      (input as any)[this.hash] = tree = new SubjectTree(`${this.nextId++}`, this.graph)
      tree.name = input.constructor.name
      this.all.push(tree)
      return tree
    }
    if(isObservable(input)) {
      (input as any)[this.hash] = tree = new ObservableTree(`${this.nextId++}`, this.graph)
      tree.name = input.constructor.name
      this.all.push(tree)
      return tree
    }
    if(isObserver(input)) {
      (input as any)[this.hash] = tree = new ObserverTree(`${this.nextId++}`, this.graph)
      tree.name = input.constructor.name
      // if(tree.name === "AutoDetachObserver") {
      //   console.log("Captured ADO", new Error().stack)
      // }
      this.all.push(tree)
      return tree
    }
  }

  private tagDisposable(input: any): IObserverTree[] {
    if(isDisposable(input)) {
      input.source
    }

    return []
  }

  private tagObserver(input: any): IObserverTree[] {
    if(isObserver(input)) {
      let tree = this.tag(input) as IObserverTree

      // Rx specific: Subjects get subscribed AutoDetachObserver's, unfold these
      if(isObserver(input.observer) && input.constructor.name === "AutoDetachObserver") {
        tree.setSink(([this.tag(input.observer) as IObserverTree]), " via upper ADO._o")
      }

      // Rx specific: InnerObservers have references to their sinks via a AutoDetachObserver
      let list = elvis(input, ["o", "observer"]) // InnerObservers
        .concat(elvis(input, ["_o", "observer"])) // InnerObservers
        .concat(elvis(input, ["parent"])) // what was this again?
        .concat(elvis(input, ["_s", "o"])) // ConcatObserver
      // console.log(list)
      list.slice(0, 1).forEach(sink => {
        tree.setSink(this.tagObserver(sink), " via o.observer")
      })

      return [tree]
    }
    return []
  }

  private tagObservable(input: any, callRecord?: ICallRecord): IObservableTree[] {
    if (isObservable(input)) {
      let tree = this.tag(input) as IObservableTree
      if(callRecord) {
        tree.call = { method: callRecord.method, args: callRecord.arguments }
      }
      if(input.source) {
        tree.setSources(this.tagObservable(input.source))
      } else if((input as any)._sources) {
        tree.setSources((input as any)._sources.flatMap((s: any) => this.tagObservable(s)))
      }
      return [tree]
    }
    return []
  }
}
