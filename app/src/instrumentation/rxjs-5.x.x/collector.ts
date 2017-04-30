import { ICallRecord, ICallStart, callRecordType } from "../../collector/callrecord"
import { RxCollector, elvis } from "../../collector/collector"
import { Event, IEvent, Timing } from "../../collector/event"
import { formatArguments } from "../../collector/logger"
import {
  IObservableTree, IObserverTree, ISchedulerInfo, ITreeLogger,
  ObservableTree, ObserverTree, SchedulerInfo, SchedulerType, SubjectTree,

} from "../../oct/oct"
import { getPrototype } from "../../utils"
import { isObservable, isObserver, isScheduler, isSubject } from "./instrumentation"
import * as Rx from "rxjs"
import { Observable } from "rxjs"
import { IScheduler } from "rxjs/Scheduler"

let debug = false

function getScheduler<T>(obs: Observable<T>, record?: ICallStart): IScheduler | undefined {
  return (obs as any).scheduler ||
    (obs as any)._scheduler ||
    record && ([].filter.call(record.arguments || [], isScheduler)[0])
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
  public symbol: symbol
  public collectorId: number
  public nextId = 1
  public logger: ITreeLogger
  private eventSequencer = new SequenceTicker()

  private wireStarts: WireStart[] = []
  private wires: Wire[] = []

  public otree: IObservableTree[] = []
  public stree: IObserverTree[] = []

  private schedulers: { scheduler: IScheduler, info: ISchedulerInfo }[] = []
  private scheduler?: { scheduler: IScheduler, info: ISchedulerInfo }

  public constructor(logger: ITreeLogger) {
    this.collectorId = TreeCollector.collectorId++
    this.logger = logger
    this.symbol = Symbol("tree")
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
    return fn
  }

  public schedule(scheduler: IScheduler, method: string, action: Function, state: any): Function | undefined {
    return
    // let info = this.tag(scheduler)
    // let self = this
    // if (method.startsWith("schedule") && method !== "scheduleRequired") {
    //   // tslint:disable-next-line:only-arrow-functions
    //   return function () {
    //     let justAssigned = self.scheduler = { scheduler, info: info as ISchedulerInfo }
    //     self.eventSequencer.next()
    //     let result = action.apply(this, arguments)
    //     if (self.scheduler === justAssigned) {
    //       self.scheduler = undefined
    //     }
    //     return result
    //   }
    // }
  }

  public before(record: ICallStart, parents?: ICallStart[]): this {
    // tag all encountered Observables & Subscribers
    [record.subject, ...record.arguments].forEach(this.tag.bind(this))

    if (callRecordType(record) === "event" && isObserver(record.subject)) {
      let event = Event.fromRecord(record, this.getTiming())
      if (event) {
        let observer = this.tag(record.subject) as IObserverTree
        this.addEvent(observer, event, record.arguments[0])
      }
    }
    return this
  }

  public after(record: ICallRecord): void {
    // tag all encountered Observables & Subscribers
    [record.returned].forEach(t => this.tag(t, record))

    if (isObservable(record.returned)) {
      this.linkSources(record.returned)

      let shouldName = isFirstOpOntoSubject(record) && (
        // b = a.map(lambda) => linked by source property
        isSource(record.subject, record.returned) ||
        // Observable.of() has record.subject == static Observable
        !isObservable(record.subject) && !hasSource(record.returned)
      )

      if (shouldName) {
        let tree = this.tag(record.returned) as IObservableTree
        tree.addMeta({
          calls: {
            subject: `callRecord.subjectName ${this.hasTag(record.subject) && this.tag(record.subject).id}`,
            args: formatArguments(record.arguments),
            method: record.method,
          },
        })
      }
    }

    if (callRecordType(record) === "subscribe") {
      if (isObserver(record.arguments[0])) {
        this.linkSubscribeSource(record.arguments[0], record.subject)
        this.linkSinks(record.arguments[0])
      } else if (isObserver(record.returned)) {
        this.linkSubscribeSource(record.returned, record.subject)
        this.linkSinks(record.returned)
      }
    }
  }

  public getEventReason(record: ICallStart): string | undefined {
    // return [record.parent, record.parent && record.parent.parent]
    //   .filter(r => r && isObserver(r.subject) && this.hasTag(r.subject))
    //   .map(r => this.tag(r.subject).id)[0]
    return
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

    if (!observer.inflow || observer.inflow.length === 0) {
      this.eventSequencer.next()
    }

    event.timing = this.getTiming()
    observer.addEvent(event)
  }

  private hasTag(input: any): boolean {
    return typeof input === "object" && input !== null && typeof input[this.symbol] !== "undefined"
  }

  private tag(input: any, record?: ICallStart): IObserverTree | IObservableTree | ISchedulerInfo | undefined {
    if (typeof input === "undefined") {
      return undefined
    }
    if (typeof input[this.symbol] !== "undefined") {
      return input[this.symbol]
    }

    if (isSubject(input)) {
      let tree = (input as any)[this.symbol] = new SubjectTree(`${this.nextId++}`,
        input.constructor.name, this.logger, this.getScheduler(input))
      this.linkSources(input)
      this.addo(tree)
      return tree
    }
    if (isObservable(input)) {
      let tree = (input as any)[this.symbol] = new ObservableTree(`${this.nextId++}`,
        input.constructor.name, this.logger, this.getScheduler(input, record)
      )
      this.linkSources(input)
      this.addo(tree)
      return tree
    }
    if (isObserver(input)) {
      let tree = (input as any)[this.symbol] = new ObserverTree(`${this.nextId++}`,
        input.constructor.name, this.logger)
      this.linkSinks(input)
      this.adds(tree)
      return tree
    }
    if (isScheduler(input)) {
      let scheduler = input as IScheduler
      let clock = scheduler.now()
      let type = schedulerType(input)
      let info = new SchedulerInfo(
        `${this.nextId++}`, getPrototype(scheduler).constructor.name,
        type, clock, this.logger
      );
      (input as any)[this.symbol] = info;
      this.schedulers.push({ scheduler, info })
      return info
    }
    return
  }

  private adds(tree: IObserverTree) {
    this.stree.push(tree)
  }

  private addo(tree: IObservableTree) {
    this.otree.push(tree)
  }

  private getScheduler<T>(input: Observable<T>, record?: ICallStart): ISchedulerInfo {
    if (isObservable(input) && getScheduler(input, record)) {
      return this.tag(getScheduler(input, record)) as ISchedulerInfo
    }
    return
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
    // if (isObserver(input)) {
    //   let tree = this.tag(input) as IObserverTree

    //   // Find sink
    //   let sinks = getSink(input, record)
    //   sinks.forEach(([how, sink]) => {
    //     tree.setSink([this.tag(sink) as IObserverTree], how)
    //   })

    //   return [tree]
    // }
    return []
  }

  private tagObservable(input: any, callRecord?: ICallStart): IObservableTree[] {
    // if (isObservable(input)) {
    //   let wasTagged = this.hasTag(input)
    //   let tree = this.tag(input, callRecord) as IObservableTree
    //   /* TODO find other way: this is a shortcut to prevent MulticastObservable._fn1 to show up */
    //   if (callRecord && callRecord.method[0] !== "_") {
    //     while (callRecord && isObservable((callRecord as ICallRecord).returned) && callRecord.method[0] !== "_") {
    //       tree.addMeta({
    //         calls: {
    //           subject: `callRecord.subjectName ${this.hasTag(callRecord.subject) && this.tag(callRecord.subject).id}`,
    //           args: formatArguments(callRecord.arguments),
    //           method: callRecord.method,
    //         },
    //       })
    //       callRecord = callRecord.parent
    //     }
    //   }
    //   if (!wasTagged) {
    //     if ((input as any).source) {
    //       tree.setSources(this.tagObservable((input as any).source))
    //     } else if ((input as any)._sources) {
    //       tree.setSources((input as any)._sources.flatMap((s: any) => this.tagObservable(s)))
    //     }
    //   }
    //   if (getScheduler(input)) {
    //     this.tag(getScheduler(input))
    //   }
    //   return [tree]
    // }
    return []
  }

  // private observableWrapper<T, R>(target: T, context: Rx.Observable<R>, outerContext: () => Rx.Observable<R>): T {
  //   function subscribe() {
  //     if (debug) {
  //       console.debug("Wrap this higher order subscribe method\n",
  //         target.constructor.name,
  //         context.constructor.name,
  //         outerContext().constructor.name)
  //     }
  //     let result = (target as any).subscribe.apply(target, arguments)
  //     return result
  //   }
  //   return new Proxy(target, {
  //     get: (obj: any, name: string) => {
  //       if (name === "isScoped") { return true }
  //       if (name === "subscribe" && "subscribe" in target) {
  //         return subscribe
  //       }
  //       return obj[name]
  //     },
  //   })
  // }

  // // Wrap this around a Subscription to log onNext, onError, onComplete, dispose calls
  // private subscriptionWrapper<T>(target: Rx.Observer<T>, tree: IObserverTree) {
  //   if ((target as any).__isSubscriptionWrapper) {
  //     return target
  //   }
  //   // Ensure only one single Proxy is attached to the IObserverTree
  //   if ((tree as any).proxy) {
  //     return target
  //   }
  //   let collector = this
  //   let events = ["next", "error", "complete", "dispose", "unsubscribe"]
  //   tree.addEvent(Event.fromCall("subscribe", undefined, this.getTiming()))
  //   let proxy = new Proxy(target, {
  //     get: (obj: any, name: string) => {
  //       let original = obj[name]
  //       if (name === "__isSubscriptionWrapper") { return true }
  //       if (typeof original === "function" && events.indexOf(name) >= 0) {
  //         function proxy() {
  //           collector.addEvent(tree, Event.fromCall(name, arguments, undefined), arguments[0])
  //           return original.apply(this, arguments)
  //         }
  //         return proxy
  //       }
  //       return original
  //     },
  //   });
  //   (tree as any).proxy = proxy
  //   return proxy
  // }

  private linkSources<T>(observable: Rx.Observable<T>) {
    let sources = [(observable as any).source, ...((observable as any)._sources || [])]
      .filter(isObservable)
      .map(o => this.tag(o) as IObservableTree);
    (this.tag(observable) as IObservableTree).setSources(sources)
  }

  private linkSinks<T>(observer: Rx.Observer<T>) {
    if (isObservable(observer)) {
      return
    }
    let sinkOpt = [(observer as any).destination]
      .filter(o => isObserver(o) || isSubject(o))
      .map(o => this.tag(o) as IObserverTree);
    (this.tag(observer) as IObserverTree).setSink(sinkOpt)
    let parentOpt = [(observer as any).parent]
      .filter(isObserver)
      .map(o => this.tag(o) as IObserverTree);
    parentOpt.forEach(p => (this.tag(observer) as IObserverTree).setOuter(p))
  }

  private linkSubscribeSource<T>(observer: Rx.Observer<T>, observable: Rx.Observable<T>) {
    let stree = this.tag(observer) as IObserverTree
    let otree = this.tag(observable) as IObservableTree
    stree.setObservable([otree])
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
// function getSink<T>(input: Rx.Observer<T>, record?: ICallStart): [string, Rx.Observer<T>][] {
//   let anyInput = input as any
//   if (typeof anyInput.destination !== "undefined" && anyInput.destination instanceof InstrumentedRx.Subscriber) {
//     return [["destination", anyInput.destination] as [string, Rx.Observer<T>]]
//   } else {
//     return []
//   }
// }

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

function isSource<T, R>(source: Rx.Observable<T>, obs: Rx.Observable<R>): boolean {
  return (obs as any).source === source ||
    Array.isArray((obs as any)._sources) && (obs as any)._sources.indexOf(source) >= 0
}

function hasSource<T, R>(obs: Rx.Observable<R>): boolean {
  return (obs as any).source ||
    Array.isArray((obs as any)._sources) && (obs as any)._sources.length > 0
}

function isFirstOpOntoSubject(record: ICallRecord): boolean {
  return !record.parent || record.parent.subject !== record.subject
}

function schedulerType(
  scheduler: Rx.VirtualTimeScheduler |
    Rx.TestScheduler |
    typeof Rx.Scheduler.asap | typeof Rx.Scheduler.animationFrame |
    typeof Rx.Scheduler.async |
    typeof Rx.Scheduler.queue
): SchedulerType {
  if (scheduler instanceof Rx.VirtualTimeScheduler || scheduler instanceof Rx.TestScheduler) {
    return "virtual"
  } else if (scheduler === Rx.Scheduler.asap) {
    return "recursive"
  } else if (scheduler === Rx.Scheduler.async) {
    return "timeout"
  } else if (scheduler === Rx.Scheduler.animationFrame) {
    return "timeout"
  } else if (scheduler === Rx.Scheduler.queue) {
    return "recursive"
  }
}
