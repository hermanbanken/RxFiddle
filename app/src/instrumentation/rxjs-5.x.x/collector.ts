import { ICallRecord, ICallStart, callRecordType } from "../../collector/callrecord"
import { RxCollector, elvis } from "../../collector/collector"
import { Event, IEvent, Timing } from "../../collector/event"
import { formatArguments } from "../../collector/logger"
import {
  IObservableTree, IObserverTree, ISchedulerInfo, ITreeLogger,
  ObservableTree, ObserverTree, SchedulerInfo, SubjectTree,
} from "../../oct/oct"
import { getPrototype } from "../../utils"
import { InstrumentedRx, isObservable, isObserver, isScheduler, isSubscription } from "./instrumentation"
import * as Rx from "rxjs"
import { Observable } from "rxjs"
import { IScheduler } from "rxjs/Scheduler"

let debug = false

function getScheduler<T>(obs: Observable<T>, record?: ICallStart): IScheduler | undefined {
  return (obs as any).scheduler ||
    (obs as any)._scheduler ||
    record && [].slice.call(record.arguments, -1).filter(isScheduler)[0]
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

  private wireStarts: WireStart[] = []
  private wires: Wire[] = []

  private schedulers: { scheduler: IScheduler, info: ISchedulerInfo }[] = []
  private scheduler?: { scheduler: IScheduler, info: ISchedulerInfo }

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

  public schedule(scheduler: IScheduler, method: string, action: Function, state: any): Function | undefined {
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
          .flatMap((s: any) => this.tagObserver(s, record))
          .forEach((sub: any) => {
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
        // Wires
        this.wireStarts.push(
          new WireStart(record, [record.subject, ...record.arguments]
            .filter(isObservable)
            .map(o => this.tag(o) as IObservableTree)))
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
        if (isSubscription(record.returned)) {
          record.returned = this.subscriptionWrapper(record.returned, this.tag(record.returned) as IObserverTree)
        }
        break
      case "setup":
        this.tagObservable(record.returned, record)

        // Wires
        if (isObservable(record.returned)) {
          this.wireStarts.filter(w => w.call === record).forEach(w => {
            let completed = w.to([record.returned].filter(isObservable).map(o => this.tag(o) as IObservableTree))
            this.wires.push(completed)
            console.log("wire", completed)
          })
          this.wireStarts = this.wireStarts.filter(w => w.call !== record)
        }
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
      let scheduler = input as IScheduler
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

  private getScheduler<T>(input: Observable<T>, record?: ICallStart): ISchedulerInfo {
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
      let tree = this.tag(input) as IObserverTree

      // Find sink
      let sinks = getSink(input, record)
      sinks.forEach(([how, sink]) => {
        tree.setSink([this.tag(sink) as IObserverTree], how)
      })

      return [tree]
    }
    return []
  }

  private tagObservable(input: any, callRecord?: ICallStart): IObservableTree[] {
    if (isObservable(input)) {
      let wasTagged = this.hasTag(input)
      let tree = this.tag(input, callRecord) as IObservableTree
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
          callRecord = callRecord.parent
        }
      }
      if (!wasTagged) {
        if ((input as any).source) {
          tree.setSources(this.tagObservable((input as any).source))
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
    let events = ["next", "error", "complete", "dispose", "unsubscribe"]
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

/** 
 * Get destination of input Observer
 */
function getSink<T>(input: Rx.Observer<T>, record?: ICallStart): [string, Rx.Observer<T>][] {
  let anyInput = input as any
  if (typeof anyInput.destination !== "undefined" && anyInput.destination instanceof InstrumentedRx.Subscriber) {
    return [["destination", anyInput.destination] as [string, Rx.Observer<T>]]
  } else {
    return []
  }
}

class Wire {
  // tslint:disable-next-line:no-constructor-vars
  constructor(public call: ICallStart, public from: IObservableTree[], public to: IObservableTree[]) {
    (this as any)._depth = this.depth
  }

  public get depth() {
    let r: (call: ICallStart) => number = (call) =>
      typeof call.parent === "undefined" ||
        callRecordType(call.parent) !== "setup" ?
        0 :
        r(call.parent) + 1
    return r(this.call)
  }
}

class WireStart {
  // tslint:disable-next-line:no-constructor-vars
  constructor(public call: ICallStart, public from: IObservableTree[]) { }
  public to(to: IObservableTree[]) {
    return new Wire(this.call, this.from, to)
  }
}
