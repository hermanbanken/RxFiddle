import { ICallRecord, ICallStart } from "../../collector/callrecord"
import { RxCollector } from "../../collector/collector"
import "../../utils"
import * as Rx from "rx"

const rxAny: any = Rx as any

export let defaultSubjects = {
  Observable: Rx.Observable,
  "Observable.prototype": rxAny.Observable.prototype,
  "ConnectableObservable.prototype": rxAny.ConnectableObservable.prototype,
  "ObservableBase.prototype": rxAny.ObservableBase.prototype,
  "AbstractObserver.prototype": rxAny.internals.AbstractObserver.prototype,
  "AnonymousObserver.prototype": rxAny.AnonymousObserver.prototype,
  "Subject.prototype": rxAny.Subject.prototype,
}

export let defaultSchedulerFactory: { [key: string]: any } = Object.keys(Rx.Scheduler)
  .filter(name => typeof (Rx.Scheduler as any)[name] === "object")
  .filter(name => (Rx.Scheduler as any)[name].__proto__.constructor.name.indexOf("Scheduler") >= 0)
  .reduce((p, name) => {
    p[name] = (Rx.Scheduler as any)[name]
    return p
  }, {} as any)

export const HASH = "__hash"
export const IGNORE = "__ignore"

function now() {
  return typeof performance !== "undefined" ? performance.now() : new Date().getTime()
}

/* tslint:disable:interface-name */
export interface Function {
  caller?: Function
  __originalFunction?: Function | null
  apply(subject: any, args: any[] | IArguments): any
}

function hasRxPrototype(input: any): boolean {
  return typeof input === "object" && (
    rxAny.Observable.prototype.isPrototypeOf(input) ||
    rxAny.internals.AbstractObserver.prototype.isPrototypeOf(input)
  )
}

function startsWith(input: string, matcher: string) {

  let r = input.substr(0, matcher.length) === matcher
  return r
}

function detachedScopeProxy<T>(input: T): T {
  let hashes: { [id: string]: number } = {}
  if ((input as any).__detached === true) {
    return input
  }
  return new Proxy(input, {
    get: (target: any, property: PropertyKey): any => {
      if (property === "__detached") {
        return true
      }
      if (typeof property === "string" && startsWith(property, "__hash")) {
        return hashes[property]
      }
      return (target as any)[property]
    },
    set: (target, property, value): boolean => {
      if (typeof property === "string" && startsWith(property, "__hash")) {
        hashes[property] = value
      }
      return true
    },
  })
}

/**
 * Tweaks specific for RxJS 4
 */
function rxTweaks<T>(call: ICallStart): void {
  // Detach reuse of NeverObservable
  let fields: [any, PropertyKey][] = []
  fields.push([call, "subject"], [call, "returned"])
  fields.push(...[].map.call(call.arguments, (a: any, i: number) => [call.arguments, i]))
  fields.forEach(([subject, prop]) => {
    if (
      typeof subject[prop] !== "undefined" && subject[prop] !== null &&
      subject[prop].constructor.name === "NeverObservable"
    ) {
      subject[prop] = detachedScopeProxy(subject[prop])
    }
  })
  // Other tweaks here...
}

// class Ticker {
//   private tick: number = 0
//   private timeout?: Rx.IDisposable
//   private next: () => void
//   constructor() {
//     this.next = this.nextTick.bind(this)
//   }
//   public get() {
//     if (!this.timeout) {
//       this.timeout = Rx.Scheduler.currentThread.schedule({}, () => { this.next(); return Rx.Disposable.empty })
//       // this.timeout = setTimeout(this.next, 0)
//     }
//     return this.tick
//   }
//   private nextTick() {
//     this.tick++
//     this.timeout = undefined
//   }
// }

// let ticker = new Ticker()

export function getPrototype(input: any): any {
  return input.prototype || input.__proto__
}

let i = 0

export default class Instrumentation {
  public logger: RxCollector
  public open: any[] = []
  public stackTraces: boolean = true

  private subjects: { [name: string]: any; }
  private calls: (ICallStart | ICallRecord)[] = []

  private prototypes: any[] = []

  constructor(subjects: { [name: string]: any; } = defaultSubjects, logger: RxCollector) {
    this.subjects = subjects
    this.logger = logger
    Object.keys(subjects).slice(0, 1).forEach((s: string) => subjects[s][IGNORE] = true)
  }

  public isInstrumented(fn: Function, by?: Instrumentation): boolean {
    if (typeof by === "undefined") {
      return ((
        typeof fn.__originalFunction === "function" ?
          1 + (this.isInstrumented(fn.__originalFunction) as any) as number :
          0)
      ) as any as boolean
    }
    if ((fn as any).__instrumentedBy === by) { return true }
    let orig = (fn as any).__originalFunction
    return typeof orig === "function" && this.isInstrumented(orig, by)
  }

  /* tslint:disable:only-arrow-functions */
  /* tslint:disable:no-string-literal */
  /* tslint:disable:no-string-literal */
  public instrument(fn: Function, extras: { [key: string]: string; }): Function {
    let calls = this.calls
    let logger = this.logger
    let open = this.open
    let self = this

    let instrumented = new Proxy(fn, {
      apply: (target: any, thisArg: any, argumentsList: any[]) => {
        // console.log(target.caller)

        // find more
        argumentsList
          .filter(hasRxPrototype)
          .filter((v: any) => !this.isInstrumented(v))
          .forEach((t: any) => this.setupPrototype(t))

        let call: ICallStart = {
          arguments: [].slice.call(argumentsList, 0),
          childs: [],
          id: i++,
          method: extras["methodName"],
          stack: self.stackTraces ? undefined : undefined, // new Error().stack : undefined,
          subject: thisArg,
          subjectName: extras["subjectName"],
          tick: 0, // ticker.get(),
          time: now(),
        }

        // Prepare
        calls.push(call)
        if (open.length > 0) {
          call.parent = open[open.length - 1]
          call.parent.childs.push(call)
        }
        open.push(call)

        // Nicen up Rx performance tweaks
        rxTweaks(call)

        // Actual method
        let instanceLogger = logger.before(call, open.slice(0, -1))
        let returned = target.apply(call.subject, [].map.call(
          argumentsList,
          instanceLogger.wrapHigherOrder.bind(instanceLogger, call.subject))
        )

        let end: ICallRecord = call as ICallRecord
        end.returned = returned

        // Nicen up Rx performance tweaks
        rxTweaks(end)

        instanceLogger.after(end);

        // find more
        ([end.returned])
          .filter(hasRxPrototype)
          .filter((v: any) => !this.isInstrumented(v))
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
  /* tslint:enable:only-arrow-functions */
  /* tslint:enable:no-string-literal */
  /* tslint:enable:no-string-literal */

  public setup(): void {
    // Observables
    Object.keys(this.subjects)
      .forEach(name => this.setupPrototype(this.subjects[name], name))

    // Subjects
    rxAny.Subject = this.instrument(rxAny.Subject, {
      methodName: "new",
      subjectName: "Rx.Subject",
    })

    // Schedulers
    Object.keys(defaultSchedulerFactory)
      .forEach(name => this.setupSchedulerMethods(defaultSchedulerFactory[name], name))
    rxAny.TestScheduler = this.setupSchedulerPrototype(rxAny.TestScheduler, "TestScheduler")
    this.prototypes.push(rxAny)
  }

  // Swap all methods
  public setupSchedulerMethods(instance: any, name?: string) {
    let self = this
    this.prototypes.push(instance)
    this.logger.schedule(instance, name, null, null)
    let proto = getPrototype(instance)
    this.prototypes.push(proto)
    Object.keys(proto)
      .filter(key => typeof instance[key] === "function")
      .filter(key => !self.isInstrumented(instance[key], self))
      .forEach(key => {
        // if (self.isInstrumented(instance[key]) as any as number > 0) {
        //   console.log("instrumented already", self.isInstrumented(instance[key]), "times")
        // }
        let original = instance[key]

        // instance[key] = function (state: any, action: any, time: number) {
        //   self.logger.schedule(instance, key, action, { state, time })
        //   return original.apply(instance, arguments)
        // }

        instance[key] = function (state: any, action: any, time: number) {
          let args = [].slice.call(arguments, 0)
          if (key === "scheduleAbsolute") {
            console.log("Absolute scheduling", args)
            let newAction = self.logger.schedule(instance, key, args[2], { state: args[0], time: args[1] }) || action
            if (typeof args[2] === "function" && typeof newAction === "function") { args[2] = newAction }
            return original.apply(instance, args)
          }
          let newAction = self.logger.schedule(instance, key, action, { state, time }) || action
          if (typeof action === "function" && typeof newAction === "function") { args[1] = newAction }
          return original.apply(instance, args)
        }

        instance[key].__instrumentedBy = self
        instance[key].__originalFunction = original
      })
  }

  // Swap constructors
  public setupSchedulerPrototype(schedulerPrototype: any, name?: string) {
    let self = this
    if (this.isInstrumented(schedulerPrototype, this)) {
      return
    }
    return new Proxy(schedulerPrototype, {
      construct: (target, argArray, newTarget) => {
        let scheduler = new target(argArray)
        self.setupSchedulerMethods(scheduler, name)
        return scheduler
      },
      get: (target: any, property: PropertyKey): any => {
        if (property === "__instrumentedBy") { return self }
        if (property === "__originalFunction") { return schedulerPrototype }
        return (target as any)[property]
      },
    })
  }

  public setupPrototype(prototype: any, name?: string) {
    if (typeof name !== "undefined") {
      prototype.__dynamicallyInstrumented = true
    }
    let methods = Object.keys(prototype)
      .filter((key) => typeof prototype[key] === "function")

    // log, preparing for teardown
    this.prototypes.push(prototype)

    methods.forEach(key => {
      prototype[key] = this.instrument(prototype[key], {
        methodName: key,
        subjectName: name || prototype.constructor.name,
      })
    })

    // let ctor = prototype.constructor
    // prototype.constructor = function () {
    //   console.log("ctor", arguments)
    //   let r = ctor.call(this, arguments)
    //   return r
    // }
  }

  public teardown(): void {
    rxAny.Subject = this.deinstrument(rxAny.Subject)

    let properties: { key: string, subject: any }[] = this.prototypes
      .map(subject => Object.keys(subject).map(key => ({ key, subject })))
      .reduce((prev, next) => prev.concat(next), [])

    let methods = properties
      .filter(({ key, subject }) => typeof subject[key] === "function")

    // let i = 0
    methods.forEach(({ key, subject }) => {
      // i++
      subject[key] = this.deinstrument(subject[key])
    })

    // let fails = this.prototypes
    //   .map(subject => Object.keys(subject).map(key => ({ key, subject })))
    //   .reduce((prev, next) => prev.concat(next), [])
    //   .filter(({ key, subject }) => typeof subject[key] === "function")
    //   .filter(({ key, subject }) => typeof subject[key].__originalFunction === "function").length

    // console.log("Tore down", i, "methods, failures: ", fails)

    this.prototypes = []
  }
}
