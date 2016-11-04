import "../utils"
import { ICallRecord } from "./callrecord"
import { ICollector } from "./logger"
import { IGNORE, RxCollector } from "./visualizer"
import * as Rx from "rx"

const rxAny: any = <any>Rx

export let defaultSubjects = {
  Observable: Rx.Observable,
  "Observable.prototype": rxAny.Observable.prototype,
  "ObservableBase.prototype": rxAny.ObservableBase.prototype,
  "AbstractObserver.prototype": rxAny.internals.AbstractObserver.prototype,
  "AnonymousObserver.prototype": rxAny.AnonymousObserver.prototype,
  "Subject.prototype": rxAny.Subject.prototype,
}

function now() {
  return typeof performance !== "undefined" ? performance.now() : new Date().getTime()
}

/* tslint:disable:interface-name */
export interface Function {
  __originalFunction?: Function | null
  apply(subject: any, args: any[] | IArguments): any
}

function hasRxPrototype(input: any): boolean {
  return typeof input === "object" && (
    rxAny.Observable.prototype.isPrototypeOf(input) ||
    rxAny.internals.AbstractObserver.prototype.isPrototypeOf(input)
  )
}

let i = 0

export default class Instrumentation {
  public logger: ICollector & RxCollector
  public open: any[] = []
  public stackTraces: boolean = false

  private subjects: { [name: string]: any; }
  private calls: ICallRecord[] = []

  private prototypes: any[] = []

  constructor(subjects: { [name: string]: any; } = defaultSubjects, logger: ICollector & RxCollector) {
    this.subjects = subjects
    this.logger = logger
    Object.keys(subjects).slice(0, 1).forEach((s: string) => subjects[s][IGNORE] = true)
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
      apply: (target, thisArg, argumentsList) => {

        // find more
        argumentsList
          .filter(hasRxPrototype)
          .filter((v: any) => !v.hasOwnProperty("__instrumented"))
          .forEach((t: any) => this.setupPrototype(t))

        let call: ICallRecord = {
          arguments: [].slice.call(argumentsList, 0),
          childs: [],
          id: i++,
          method: extras["methodName"],
          returned: null,
          stack: self.stackTraces ? new Error().stack : undefined,
          subject: thisArg,
          subjectName: extras["subjectName"],
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
        let returned = target.apply(thisArg, [].map.call(
          argumentsList,
          instanceLogger.wrapHigherOrder.bind(instanceLogger, call.subject))
        )
        call.returned = returned
        instanceLogger.after(call)

        // find more
        new Array(returned)
          .filter(hasRxPrototype)
          .filter((v: any) => !v.hasOwnProperty("__instrumented"))
          .forEach((t: any) => this.setupPrototype(t))

        // Cleanup
        open.pop()
        return returned
      },
    })
    instrumented.__originalFunction = fn
    return instrumented
  }

  public deinstrument(fn: Function) {
    return fn.__originalFunction || fn
  }
  /* tslint:enable:only-arrow-functions */
  /* tslint:enable:no-string-literal */
  /* tslint:enable:no-string-literal */

  public setup(): void {
    Object.keys(this.subjects)
      .forEach(name => this.setupPrototype(this.subjects[name], name))
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
      prototype[key].__instrumented = true
      prototype[key] = this.instrument(prototype[key], {
        methodName: key,
        subjectName: name || prototype.constructor.name,
      })
    })
  }

  public teardown(): void {
    let properties: { key: string, subject: any }[] = this.prototypes
      .map(subject => Object.keys(subject).map(key => ({ key, subject })))
      .reduce((prev, next) => prev.concat(next), [])

    let methods = properties
      .filter(({ key, subject }) => typeof subject[key] === "function")

    methods.forEach(({ key, subject }) => {
      subject[key] = this.deinstrument(subject[key])
      delete subject.__instrumented
    })
  }
}
