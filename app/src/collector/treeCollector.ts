import {
  EdgeType, IObservableTree, IObserverTree, ITreeLogger,
  NodeType, ObservableTree, ObserverTree, SubjectTree,
} from "../oct/oct"
import { ICallRecord, ICallStart, callRecordType } from "./callrecord"
import { RxCollector, elvis, isDisposable, isObservable, isObserver } from "./collector"
import { Event } from "./event"
import { formatArguments } from "./logger"
import TypedGraph from "./typedgraph"
import * as Rx from "rx"

export class TreeGrapher implements ITreeLogger {
  public graph = new TypedGraph<ObservableTree | ObserverTree, {}>()
  public addNode(id: string, type: NodeType): void {
    if (type === "observable") {
      this.graph.setNode(id, new ObservableTree(id))
    } else if (type === "subject") {
      this.graph.setNode(id, new SubjectTree(id))
    } else {
      this.graph.setNode(id, new ObserverTree(id))
    }
  }
  public addMeta(id: string, meta: any): void {
    let existing: any = this.graph.node(id) || {}
    for (let key in meta) {
      if (meta.hasOwnProperty(key)) {
        existing[key] = (existing[key] || [])
        existing[key].push(meta[key])
      }
    }
    this.graph.setNode(id, existing)
  }
  public addEdge(v: string, w: string, type: EdgeType, meta?: any): void {
    if (type === "addSource") {
      let dest = this.graph.node(w) as ObservableTree
      let sources = (dest.sources || []).concat([this.graph.node(v) as ObservableTree])
      dest.setSources(sources)
    } else if (type === "addObserverSink") {
      let src = this.graph.node(v) as ObserverTree
      src.setSink([this.graph.node(w) as ObserverTree], meta.label)
    } else if (type === "setObserverSource") {
      let src = this.graph.node(v) as ObservableTree
      let dst = this.graph.node(w) as ObserverTree
      dst.setObservable([src])
    }
    this.graph.setEdge(v, w, meta)
  }
  public reset() {
    this.graph.nodes().forEach(n => this.graph.removeNode(n))
  }
}

export class TreeWriter implements ITreeLogger {
  public messages: any[] = []
  public addNode(id: string, type: NodeType): void {
    this.messages.push({ id, type })
  }
  public addMeta(id: string, meta: any): void {
    this.messages.push({ id, meta })
  }
  public addEdge(v: string, w: string, type: EdgeType, meta?: any): void {
    this.messages.push({ v, w, type, meta })
  }
}

export class TreeWindowPoster implements ITreeLogger {
  private post: (message: any) => void
  constructor() {
    if (typeof window === "object" && window.parent) {
      this.post = m => window.parent.postMessage(m, window.location.origin)
    } else {
      this.post = m => { /* intentionally left blank */ }
      console.error("Using Window.postMessage logger in non-browser environment", new Error())
    }
  }
  public addNode(id: string, type: NodeType): void {
    this.post({ id, type })
  }
  public addMeta(id: string, meta: any): void {
    this.post({ id, meta })
  }
  public addEdge(v: string, w: string, type: EdgeType, meta?: any): void {
    this.post({ v, w, type, meta })
  }
  public reset() {
    this.post("reset")
  }
}

export class TreeReader {
  public treeGrapher: TreeGrapher = new TreeGrapher()
  public next(message: any) {
    if (message === "reset") {
      return this.treeGrapher.reset()
    } else if (typeof message.v !== "undefined" && typeof message.w !== "undefined") {
      this.treeGrapher.addEdge(message.v, message.w, message.type, message.meta)
    } else if (typeof message.type !== "undefined") {
      this.treeGrapher.addNode(message.id, message.type)
    } else if (message) {
      this.treeGrapher.addMeta(message.id, message.meta)
    }
  }
}

export class TreeCollector implements RxCollector {
  public static collectorId = 0
  public hash: string
  public collectorId: number
  public nextId = 1
  public logger: ITreeLogger

  public constructor(logger: ITreeLogger) {
    this.collectorId = TreeCollector.collectorId++
    this.hash = this.collectorId ? `__thash${this.collectorId}` : "__thash"
    this.logger = logger
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

  public before(record: ICallStart, parents?: ICallStart[]): this {
    switch (callRecordType(record)) {
      case "subscribe":
        this.tagObservable(record);
        [].filter.call(record.arguments, isDisposable).forEach((s: any) => this.tagObserver(s))
      case "event":
        let event = Event.fromRecord(record)
        if (event && event.type === "next" && isObservable(record.arguments[0])) {
          let higher = record.arguments[0]
          event.value = {
            id: this.tag(higher).id,
            type: higher.constructor.name,
          } as any as string
        }
        if (event && event.type !== "subscribe" && this.hasTag(record.subject)) {
          this.tagObserver(record.subject).forEach(_ => _.addEvent(event))
        } else if (event && this.hasTag(record.arguments[0])) {
          this.tagObserver(record.arguments[0]).forEach(_ => _.addEvent(event))
        }
        break
      case "setup":
        this.tagObservable(record.subject)
      default: break
    }
    return this
  }

  public after(record: ICallRecord): void {
    switch (callRecordType(record)) {
      case "subscribe":
        let observers = [].filter.call(record.arguments, isObserver).slice(0, 1)
        observers.forEach((s: any) => this.tagObserver(s).forEach(observer => {
          let observable = this.tag(record.subject)
          if (observable instanceof SubjectTree) {
            // Special case for subjects
            observable.addSink(([observer]), " subject")
          } else if (observable instanceof ObservableTree) {
            observer.setObservable([observable])
          }
        }))
        break
      case "setup":
        this.tagObservable(record.returned, record)
      default: break
    }
  }

  private hasTag(input: any): boolean {
    return typeof input === "object" && typeof (input as any)[this.hash] !== "undefined"
  }

  private tag(input: any): IObserverTree | IObservableTree | undefined {
    let tree: IObserverTree | IObservableTree
    if (typeof (input as any)[this.hash] !== "undefined") {
      return (input as any)[this.hash]
    }

    if (isObserver(input) && isObservable(input)) {
      (input as any)[this.hash] = tree = new SubjectTree(`${this.nextId++}`, input.constructor.name, this.logger)
      return tree
    }
    if (isObservable(input)) {
      (input as any)[this.hash] = tree = new ObservableTree(`${this.nextId++}`, input.constructor.name, this.logger)
      return tree
    }
    if (isObserver(input)) {
      (input as any)[this.hash] = tree = new ObserverTree(`${this.nextId++}`, input.constructor.name, this.logger)
      return tree
    }
  }

  private tagObserver(input: any): IObserverTree[] {
    if (isObserver(input)) {
      let tree = this.tag(input) as IObserverTree

      // Rx specific: Subjects get subscribed AutoDetachObserver's, unfold these
      if (isObserver(input.observer) && input.constructor.name === "AutoDetachObserver") {
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
      if (callRecord) {
        tree.addMeta({
          calls: {
            args: formatArguments(callRecord.arguments),
            method: callRecord.method,
          },
        })
      }
      if (input.source) {
        tree.setSources(this.tagObservable(input.source))
      } else if ((input as any)._sources) {
        tree.setSources((input as any)._sources.flatMap((s: any) => this.tagObservable(s)))
      }
      return [tree]
    }
    return []
  }

  private proxy<T>(target: T): T {
    return new Proxy(target, {
      get: (obj: any, name: string) => {
        if (name === "isScoped") { return true }
        return obj[name]
      },
    })
  }
}
