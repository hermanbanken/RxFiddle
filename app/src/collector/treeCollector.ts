import {
  EdgeType, IObservableTree, IObserverTree, ITreeLogger,
  NodeType, ObservableTree, ObserverTree, SubjectTree,
} from "../oct/oct"
import { ICallRecord, ICallStart, callRecordType } from "./callrecord"
import { RxCollector, elvis, isDisposable, isObservable, isObserver } from "./collector"
import { Event, IEvent } from "./event"
import { formatArguments } from "./logger"
import TypedGraph from "./typedgraph"
import * as Rx from "rx"

export class TreeGrapher implements ITreeLogger {
  public graph = new TypedGraph<ObservableTree | ObserverTree, {}>()
  public addNode(id: string, type: NodeType, tick: number): void {
    if (type === "observable") {
      this.graph.setNode(id, new ObservableTree(id, undefined, undefined, tick))
    } else if (type === "subject") {
      this.graph.setNode(id, new SubjectTree(id, undefined, undefined, tick))
    } else {
      this.graph.setNode(id, new ObserverTree(id, undefined, undefined, tick))
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
  public addNode(id: string, type: NodeType, tick?: number): void {
    this.messages.push({ id, type, tick })
  }
  public addMeta(id: string, meta: any, tick?: number): void {
    this.messages.push({ id, meta, tick })
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
  public addNode(id: string, type: NodeType, tick?: number): void {
    this.post({ id, type, tick })
  }
  public addMeta(id: string, meta: any, tick?: number): void {
    this.post({ id, meta, tick })
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
  public maxTick = -1
  public next(message: any): void {
    if (message === "reset") {
      this.maxTick = -1
      return this.treeGrapher.reset()
    }
    if (typeof message === "object" && typeof message.tick === "number") {
      this.maxTick = Math.max(this.maxTick, message.tick)
    }
    if (typeof message.v !== "undefined" && typeof message.w !== "undefined") {
      this.treeGrapher.addEdge(message.v, message.w, message.type, message.meta)
    } else if (typeof message.type !== "undefined") {
      this.treeGrapher.addNode(message.id, message.type, message.tick)
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
  public eventSequence = 0

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
        let obs = this.tagObservable(record.subject);
        [].slice.call(record.arguments, 0, 1)
          .filter(isObserver)
          .filter((_: any) => _.constructor.name !== "AutoDetachObserver")
          .flatMap((s: any) => this.tagObserver(s, record)).forEach((sub: any) => {
            obs.forEach(observable => {
              if (observable instanceof SubjectTree) {
                // Special case for subjects
                observable.addSink(([sub]), " subject")
              } else if (observable instanceof ObservableTree) {
                sub.setObservable([observable])
              }
            })
          })
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
          this.tagObserver(record.subject).forEach(_ => this.addEvent(_, event))
        } else if (event && this.hasTag(record.arguments[0])) {
          this.tagObserver(record.arguments[0]).forEach(_ => this.addEvent(_, event))
        }
        break
      case "setup":
        this.tagObservable(record.subject)
      default: break
    }
    return this
  }

  public addEvent(observer: IObserverTree, event: IEvent) {
    if (!observer.inflow || observer.inflow.length === 0) {
      this.eventSequence++
    }
    event.tick = this.eventSequence
    observer.addEvent(event)
  }

  public after(record: ICallRecord): void {
    switch (callRecordType(record)) {
      case "subscribe":
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
    if (typeof input === "undefined") {
      return undefined
    }
    if (typeof (input as any)[this.hash] !== "undefined") {
      return (input as any)[this.hash]
    }

    if (isObserver(input) && isObservable(input)) {
      (input as any)[this.hash] = tree = new SubjectTree(`${this.nextId++}`,
        input.constructor.name, this.logger, this.eventSequence)
      return tree
    }
    if (isObservable(input)) {
      (input as any)[this.hash] = tree = new ObservableTree(`${this.nextId++}`,
        input.constructor.name, this.logger, this.eventSequence)
      return tree
    }
    if (isObserver(input)) {
      (input as any)[this.hash] = tree = new ObserverTree(`${this.nextId++}`,
        input.constructor.name, this.logger, this.eventSequence)
      return tree
    }
  }

  private tagObserver(input: any, record?: ICallStart): IObserverTree[] {
    if (isObserver(input)) {

      // Rx specific: unfold AutoDetachObserver's, 
      while (input && input.constructor.name === "AutoDetachObserver" && input.observer) {
        input = input.observer
      }

      let tree = this.tag(input) as IObserverTree

      // Find sink
      let sinks = this.getSink(input, record)
      sinks.forEach(([how, sink]) => {
        tree.setSink([this.tag(sink) as IObserverTree], how)
      })

      return [tree]
    }
    return []
  }

  private getSink<T>(input: Rx.Observer<T>, record?: ICallStart): [string, Rx.Observer<T>][] {
    // Rx specific: InnerObservers have references to their sinks via a AutoDetachObserver
    let list = elvis(input, ["o", "observer"]) // InnerObservers
      .concat(elvis(input, ["_o", "observer"])) // InnerObservers
      .concat(elvis(input, ["parent"])) // what was this again?
      .concat(elvis(input, ["_s", "o"])) // ConcatObserver
      .concat(elvis(input, ["observer"])) // ConcatObserver
      .map(s => [" via o.observer", s])
    // If no sinks could be found via object attributes, try to find it via the call stack
    if (record && !list.length && callStackDepth(record) > 2 && !(isObservable(input) && isObserver(input))) {
      list.push(...sequenceUnique(
        _ => _.sub,
        generate(record, _ => _.parent)
          .map(rec => ({
            sub: rec.arguments[0] as Rx.Observer<T>,
          }))
          .filter(_ => isObserver(_.sub) && _.sub !== input)
      ).slice(1, 2).map(_ => [" via callstack", _.sub]))
    }

    return list.slice(0, 1).flatMap(([how, sink]: [string, Rx.Observer<T>]) => {
      if (sink.constructor.name === "AutoDetachObserver") {
        return this.getSink(sink)
      } else {
        return [[how, sink] as [string, Rx.Observer<T>]]
      }
    })
  }

  private tagObservable(input: any, callRecord?: ICallStart): IObservableTree[] {
    if (isObservable(input)) {
      let wasTagged = this.hasTag(input)
      let tree = this.tag(input) as IObservableTree
      if (!wasTagged) {
        while (callRecord) {
          tree.addMeta({
            calls: {
              args: formatArguments(callRecord.arguments),
              method: callRecord.method,
            },
          })
          callRecord = callRecord.parent
        }
        if (input.source) {
          tree.setSources(this.tagObservable(input.source))
        } else if ((input as any)._sources) {
          tree.setSources((input as any)._sources.flatMap((s: any) => this.tagObservable(s)))
        }
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

  private findFirstObserverInCallStack(forObservable: IObservableTree, record?: ICallStart): IObserverTree | undefined {
    let arg0 = record && record.arguments[0]
    if (record && record.arguments.length > 0 && this.hasTag(arg0) && isObserver(arg0)) {
      let tag = this.tag(arg0) as IObserverTree
      console.log("names", tag.observable && tag.observable.names, forObservable.names)
      if (tag.observable && tag.observable === forObservable) {
        return tag
      }
    }
    if (record) {
      return this.findFirstObserverInCallStack(forObservable, record.parent)
    }
  }
}

function printStack(record?: ICallStart): string {
  if (typeof record === "undefined") {
    return ""
  }
  return "\n\t" + `${record.subject.constructor.name}.${record.method}(${formatArguments(record.arguments)})` +
    (record.parent ? printStack(record.parent) : "")
}

function callStackDepth(record: ICallStart): number {
  return typeof record.parent === "undefined" ? 1 : 1 + callStackDepth(record.parent)
}

function generate<T>(seed: T, next: (acc: T) => T | undefined | null): T[] {
  if (typeof seed === "undefined" || seed === null) {
    return []
  } else {
    return [seed, ...generate(next(seed), next)]
  }
}

function sequenceUnique<T, K>(keySelector: (e: T) => K, list: T[]): T[] {
  let filtered = [] as T[]
  for (let v of list) {
    if (filtered.length === 0 || keySelector(filtered[filtered.length - 1]) !== keySelector(v)) {
      filtered.push(v)
    }
  }
  return filtered
}
