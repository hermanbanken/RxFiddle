import { ICallRecord, ICallStart, callRecordType } from "../../collector/callrecord"
import { RxCollector, elvis, isDisposable, isObservable, isObserver, isScheduler } from "../../collector/collector"
import { Event, IEvent, Timing } from "../../collector/event"
import { formatArguments } from "../../collector/logger"
import {
  IObservableTree, IObserverTree, ISchedulerInfo, ITreeLogger,
  ObservableTree, ObserverTree, SchedulerInfo, SubjectTree,
} from "../../oct/oct"
import { getPrototype } from "../../utils"
import * as Rx from "rx"

let debug = false

function getScheduler<T>(obs: Rx.Observable<T>, record?: ICallStart): Rx.IScheduler | undefined {
  return (obs as any).scheduler ||
    (obs as any)._scheduler ||
    record && [].slice.call(record.arguments, -1).filter(isScheduler)[0]
}

function schedulerInfo(s: Rx.IScheduler | ISchedulerInfo): ISchedulerInfo {
  if (typeof (s as any).schedule === "function") {
    let scheduler = s as Rx.ICurrentThreadScheduler
    return {
      clock: scheduler.now(),
      id: ((scheduler as any).id ||
        ((scheduler as any).id = new Date().getTime() + "") && (scheduler as any).id) as string,
      name: (s as any).constructor.name,
      type: "immediate",
    }
  }
  return s as ISchedulerInfo
}

class SequenceTicker {
  public last = 0
  public used = false

  public next(): void {
    if (this.used) {
      this.used = false
      this.last++
    }
  }
  public get(): number {
    this.used = true
    return this.last
  }
}

export class TreeCollector implements RxCollector {
  public static collectorId = 0
  public hash: string
  public collectorId: number
  public nextId = 1
  public logger: ITreeLogger
  private eventSequencer = new SequenceTicker()

  private schedulers: { scheduler: Rx.IScheduler, info: ISchedulerInfo }[] = []
  private scheduler?: { scheduler: Rx.IScheduler, info: ISchedulerInfo }

  public constructor(logger: ITreeLogger) {
    this.collectorId = TreeCollector.collectorId++
    this.hash = this.collectorId ? `__thash${this.collectorId}` : "__thash"
    this.logger = logger
  }

  /**
   * Used to wrap arguments of higher order functions. Consider:
   *   
   *   let a = Rx.Observable.just(1)
   *   a.flatMap((nr) => Rx.Observable.of(nr, nr * 2, nr * 3))
   * 
   * now wrapHigherOrder is called like this:
   * 
   *   wrapHigherOrder(a, (nr) => Rx.Observable.of(nr, nr * 2, nr * 3))
   * 
   * so we can inject a custom function which can link the result of the lambda to `a`.
   * 
   * @param subject observable to link to
   * @param fn function (or any other argument) to wrap
   */
  public wrapHigherOrder(call: ICallRecord, fn: Function | any): Function | any {
    let self = this
    if (typeof fn === "function" && isObservable(call.subject)) {
      function replacementLambda() {
        let result = fn.apply(this, arguments)
        if (typeof result === "object" && isObservable(result)) {
          return self.observableWrapper(result, call.subject, () => call.returned)
        }
        return result
      }
      (replacementLambda as any).__original = fn
      return replacementLambda
    }
    return fn
  }

  public schedule(scheduler: Rx.IScheduler, method: string, action: Function, state: any): Function | undefined {
    let info = this.tag(scheduler)
    let self = this
    if (method.startsWith("schedule") && method !== "scheduleRequired") {
      // tslint:disable-next-line:only-arrow-functions
      return function () {
        let justAssigned = self.scheduler = { scheduler, info: info as ISchedulerInfo }
        self.eventSequencer.next()
        let result = action.apply(this, arguments)
        if (self.scheduler === justAssigned) {
          self.scheduler = undefined
        }
        return result
      }
    }
  }

  public before(record: ICallStart, parents?: ICallStart[]): this {
    switch (callRecordType(record)) {
      case "subscribe":
        let obs = this.tagObservable(record.subject);
        [].slice.call(record.arguments, 0, 1)
          .filter(isObserver)
          .map((s: Rx.Observer<any>) => {
            record.arguments[0] = this.subscriptionWrapper(record.arguments[0], this.tagObserver(s, record)[0])
            return s
          })
          .flatMap((s: any) => this.tagObserver(s, record)).forEach((sub: any) => {
            obs.forEach(observable => {
              if (observable instanceof SubjectTree) {
                // Special case for subjects
                observable.addSink(([sub]), " subject")
                sub.setObservable([observable])
              } else if (observable instanceof ObservableTree) {
                sub.setObservable([observable])
              }
            })
          })
        break
      case "setup":
        this.tagObservable(record.subject)
      default: break
    }
    return this
  }

  public getEventReason(record: ICallStart): string | undefined {
    return [record.parent, record.parent && record.parent.parent]
      .filter(r => r && isObserver(r.subject) && this.hasTag(r.subject))
      .map(r => this.tag(r.subject).id)[0]
  }

  public addEvent(observer: IObserverTree, event: IEvent, value?: any) {
    if (typeof event === "undefined") { return }

    // Enrich higher order events
    if (event.type === "next" && isObservable(value)) {
      event.value = {
        id: this.tag(value).id,
        type: value.constructor.name,
      } as any as string
    }

    // Ignore 2nd subscribe (subscribe & _subscribe are instrumented both)
    if (observer.events.length === 1 && observer.events[0].type === "subscribe" && event.type === "subscribe") {
      return
    }

    if (!observer.inflow || observer.inflow.length === 0) {
      this.eventSequencer.next()
    }

    event.timing = this.getTiming()
    observer.addEvent(event)
  }

  public after(record: ICallRecord): void {
    switch (callRecordType(record)) {
      case "subscribe":
        if (isDisposable(record.returned)) {
          record.returned = this.disposableWrapper(record.returned, record.arguments[0])
        }
        break
      case "setup":
        this.tagObservable(record.returned, record)
      default: break
    }
  }

  private hasTag(input: any): boolean {
    return typeof input === "object" && input !== null && typeof (input as any)[this.hash] !== "undefined"
  }

  private tag(input: any, record?: ICallStart): IObserverTree | IObservableTree | ISchedulerInfo | undefined {
    let tree: IObserverTree | IObservableTree
    if (typeof input === "undefined") {
      return undefined
    }
    if (typeof (input as any)[this.hash] !== "undefined") {
      return (input as any)[this.hash]
    }

    if (isObserver(input) && isObservable(input)) {
      (input as any)[this.hash] = tree = new SubjectTree(`${this.nextId++}`,
        input.constructor.name, this.logger, this.getScheduler(input))
      return tree
    }
    if (isObservable(input)) {
      (input as any)[this.hash] = tree = new ObservableTree(`${this.nextId++}`,
        input.constructor.name, this.logger, this.getScheduler(input, record)
      )
      return tree
    }
    if (isObserver(input)) {
      (input as any)[this.hash] = tree = new ObserverTree(`${this.nextId++}`,
        input.constructor.name, this.logger)
      return tree
    }
    if (isScheduler(input)) {
      let scheduler = input as Rx.IScheduler
      let type: "immediate" | "recursive" | "timeout" | "virtual"
      switch (getPrototype(scheduler).constructor.name) {
        case "ImmediateScheduler":
          type = "immediate"
          break
        case "DefaultScheduler":
          type = "timeout"
          break
        case "CurrentThreadScheduler":
          type = "recursive"
          break
        case "TestScheduler":
          type = "virtual"
          break
        default:
          if (debug) { console.debug("unknown scheduler type", getPrototype(scheduler).constructor.name) }
          type = "virtual"
          break
      }
      let clock = scheduler.now()
      let info = new SchedulerInfo(
        `${this.nextId++}`, getPrototype(scheduler).constructor.name,
        type, clock, this.logger
      );
      (input as any)[this.hash] = info
      this.schedulers.push({ scheduler, info })
      return info
    }
  }

  private getScheduler(input: Rx.Observable<any>, record?: ICallStart): ISchedulerInfo {
    if (isObservable(input) && getScheduler(input, record)) {
      return this.tag(getScheduler(input, record)) as ISchedulerInfo
    }
  }

  private getTiming(): Timing {
    let clocks: { [id: string]: number } = { tick: this.eventSequencer.get() }
    if (this.scheduler) {
      clocks[this.scheduler.info.id] = this.scheduler.scheduler.now()
      return Object.assign({
        scheduler: this.scheduler.info.id,
        clocks,
      })
    }
    return {
      clocks,
      scheduler: "tick",
    }
  }

  private tagObserver(input: any, record?: ICallStart, traverse: boolean = true): IObserverTree[] {
    if (isObserver(input)) {

      // Rx specific: unfold AutoDetachObserver's, 
      while (traverse && input && input.constructor.name === "AutoDetachObserver" && input.observer) {
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
      let tree = this.tag(input, callRecord) as IObservableTree
      if (!wasTagged) {
        /* TODO find other way: this is a shortcut to prevent MulticastObservable._fn1 to show up */
        if (callRecord && callRecord.method[0] !== "_") {
          while (callRecord && isObservable((callRecord as ICallRecord).returned) && callRecord.method[0] !== "_") {
            tree.addMeta({
              calls: {
                subject: `callRecord.subjectName ${this.hasTag(callRecord.subject) && this.tag(callRecord.subject).id}`,
                args: formatArguments(callRecord.arguments),
                method: callRecord.method,
              },
            })

            // if (typeof callRecord.parent !== "undefined" && isObservable(callRecord.parent.subject)) {
            callRecord = callRecord.parent
            // } else {
            //   callRecord = undefined
            // }
          }
        }
        if (input.source) {
          tree.setSources(this.tagObservable(input.source))
        } else if ((input as any)._sources) {
          tree.setSources((input as any)._sources.flatMap((s: any) => this.tagObservable(s)))
        }
      }
      if (getScheduler(input)) {
        this.tag(getScheduler(input))
      }
      return [tree]
    }
    return []
  }

  private observableWrapper<T, R>(target: T, context: Rx.Observable<R>, outerContext: () => Rx.Observable<R>): T {
    function subscribe() {
      if (debug) {
        console.debug("Wrap this higher order subscribe method\n",
          target.constructor.name,
          context.constructor.name,
          outerContext().constructor.name)
      }
      let result = (target as any).subscribe.apply(target, arguments)
      return result
    }
    return new Proxy(target, {
      get: (obj: any, name: string) => {
        if (name === "isScoped") { return true }
        if (name === "subscribe" && "subscribe" in target) {
          return subscribe
        }
        return obj[name]
      },
    })
  }

  // Wrap this around a Subscription to log onNext, onError, onComplete, dispose calls
  private subscriptionWrapper<T>(target: Rx.Observer<T>, tree: IObserverTree) {
    if ((target as any).__isSubscriptionWrapper) {
      return target
    }
    // Ensure only one single Proxy is attached to the IObserverTree
    if ((tree as any).proxy) {
      return target
    }
    let collector = this
    let events = ["onNext", "onError", "onCompleted", "dispose"]
    tree.addEvent(Event.fromCall("subscribe", undefined, this.getTiming()))
    let proxy = new Proxy(target, {
      get: (obj: any, name: string) => {
        let original = obj[name]
        if (name === "__isSubscriptionWrapper") { return true }
        if (typeof original === "function" && events.indexOf(name) >= 0) {
          function proxy() {
            collector.addEvent(tree, Event.fromCall(name, arguments, undefined), arguments[0])
            return original.apply(this, arguments)
          }
          return proxy
        }
        return original
      },
    });
    (tree as any).proxy = proxy
    return proxy
  }

  // Wrap this around a Disposable to log dispose calls onto the supplied observer
  private disposableWrapper<T>(target: Rx.Disposable, observer?: any) {
    if ((target as any).__isDisposableWrapper) {
      return target
    }
    let tree: IObserverTree[] = isObserver(observer) ? this.tagObserver(observer) : []
    let collector = this
    return new Proxy(target, {
      get: (obj: any, name: string) => {
        let original = obj[name]
        if (name === "__isDisposableWrapper") { return true }
        if (typeof original === "function" && name === "dispose") {
          function proxy() {
            collector.addEvent(tree[0], Event.fromCall(name, arguments, undefined))
            return original.apply(this, arguments)
          }
          return proxy
        }
        return original
      },
    })
  }

  private findFirstObserverInCallStack(forObservable: IObservableTree, record?: ICallStart): IObserverTree | undefined {
    let arg0 = record && record.arguments[0]
    if (record && record.arguments.length > 0 && this.hasTag(arg0) && isObserver(arg0)) {
      let tag = this.tag(arg0) as IObserverTree
      if (debug) { console.debug("names", tag.observable && tag.observable.names, forObservable.names) }
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

function eventUpwards(e: IEvent) {
  return e.type === "subscribe" || e.type === "dispose"
}
