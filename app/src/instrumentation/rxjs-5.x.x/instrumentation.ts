// tslint:disable:no-constructor-vars
// tslint:disable:object-literal-key-quotes
import { ICallRecord, ICallStart } from "../../collector/callrecord"
import { RxCollector } from "../../collector/collector"

// Allow either external scoped Rx or local imported Rx to be used
import * as RxImported from "rxjs/Rx"
import { IScheduler } from "rxjs/Scheduler"
declare let Rx: any
export let InstrumentedRx: typeof RxImported = typeof Rx === "undefined" ? RxImported : Rx

let i = 0
export default class Instrumentation {
  private subjects: { [name: string]: any; }
  private prototypes: any[] = []
  private open: any[] = []
  private calls: (ICallStart | ICallRecord)[] = []

  constructor(private collector: RxCollector) {
    this.collector = collector
    this.subjects = {
      "Observable": InstrumentedRx.Observable.prototype,
      "ObservableStatic": InstrumentedRx.Observable,
      "SubjectStatic": InstrumentedRx.Subject,
      "Subject": InstrumentedRx.Subject.prototype,
    }
  }

  public setup(): void {
    Object.keys(this.subjects)
      .forEach(name => this.setupPrototype(this.subjects[name], name))
    /* TODO:
     - schedulers
     - constructors
    */
  }

  public teardown(): void {
    let properties: { key: string, target: any }[] = this.prototypes
      .map(target => Object.keys(target).map(key => ({ key, target })))
      .reduce((prev, next) => prev.concat(next), [])

    // Methods
    properties
      .filter(({ key, target }) => typeof target[key] === "function")
      .forEach(({ key, target }) => {
        target[key] = this.deinstrument(target[key])
      })

    // Prototypes
    this.prototypes
      .filter(proto => "__dynamicallyInstrumented" in proto)
      .forEach(proto => delete proto.__dynamicallyInstrumented)

    this.prototypes = []
  }

  /* tslint:disable:only-arrow-functions */
  /* tslint:disable:no-string-literal */
  /* tslint:disable:no-string-literal */
  public instrument(fn: Function, extras: { [key: string]: string; }): Function {
    let calls = this.calls
    let logger = this.collector
    let open = this.open
    let self = this

    let instrumented = new Proxy(fn, {
      apply: (target: any, thisArg: any, argumentsList: any[]) => {
        // console.log(target.caller)

        // find more
        argumentsList
          .filter(hasRxObservablePrototype)
          .filter((v: any) => !isInstrumented(v))
          .forEach((t: any) => this.setupPrototype(t))

        let call: ICallStart = {
          arguments: [].slice.call(argumentsList, 0),
          childs: [],
          id: i++,
          method: extras["methodName"],
          subject: thisArg,
          subjectName: extras["subjectName"],
          tick: 0,
          time: now(),
        }

        // Prepare
        calls.push(call)
        if (open.length > 0) {
          call.parent = open[open.length - 1]
          call.parent.childs.push(call)
        }
        open.push(call)

        // Actual method
        let instanceLogger = logger.before(call, open.slice(0, -1))
        let returned = target.apply(call.subject, [].map.call(
          call.arguments,
          instanceLogger.wrapHigherOrder.bind(instanceLogger, call))
        )

        let end: ICallRecord = call as ICallRecord
        end.returned = returned

        instanceLogger.after(end);

        // find more
        ([end.returned])
          .filter(hasRxObservablePrototype)
          .filter((v: any) => !isInstrumented(v))
          .forEach((t: any) => this.setupPrototype(t))

        // Cleanup
        open.pop()
        return end.returned
      },
      construct: (target: { new (...args: any[]): any }, args) => {
        console.warn("TODO, instrument constructor", target, args)
        return new target(...args)
      },
      get: (target: any, property: PropertyKey): any => {
        if (property === "__instrumentedBy") { return self }
        if (property === "__originalFunction") { return fn }
        return (target as any)[property]
      },
    })
    return instrumented
  }

  public deinstrument(fn: Function): Function {
    return fn.__originalFunction && this.deinstrument(fn.__originalFunction) || fn
  }

  public setupPrototype(prototype: any, name?: string) {
    if (typeof name !== "undefined") {
      prototype.__dynamicallyInstrumented = true
    }
    let methods = Object.keys(prototype)
      .filter((key) => typeof prototype[key] === "function")

    // store, preparing for teardown
    this.prototypes.push(prototype)

    methods.forEach(key => {
      prototype[key] = this.instrument(prototype[key], {
        methodName: key,
        subjectName: name || prototype.constructor.name,
      })
    })
  }

}

function now() {
  return typeof performance !== "undefined" ? performance.now() : new Date().getTime()
}

/* tslint:disable:interface-name */
export interface Function {
  caller?: Function
  __originalFunction?: Function | null
  apply(subject: any, args: any[] | IArguments): any
}

function hasRxObservablePrototype(input: any): boolean {
  return typeof input === "object" && InstrumentedRx.Observable.prototype.isPrototypeOf(input)
}

export function isInstrumented(fn: Function, by?: Instrumentation): boolean {
  if (typeof by === "undefined") {
    return ((
      typeof fn.__originalFunction === "function" ?
        1 + (this.isInstrumented(fn.__originalFunction) as any) as number :
        0)
    ) as any as boolean
  }
  if ((fn as any).__instrumentedBy === by) { return true }
  let orig = (fn as any).__originalFunction
  return typeof orig === "function" && isInstrumented(orig, by)
}



export function isObservable<T>(v: any): v is RxImported.Observable<T> {
  return typeof v === "object" && v !== null && typeof v.subscribe === "function"
}

export function isSubscription(v: any): v is RxImported.Subscription & any {
  return v instanceof InstrumentedRx.Subscriber
}
export function isObserver(v: any): v is RxImported.Subscription & any {
  return v instanceof InstrumentedRx.Subscriber
}
export function isScheduler(v: any): v is IScheduler & any {
  return typeof v === "object" && v !== null && typeof v.now === "function" && typeof v.schedule === "function"
}
