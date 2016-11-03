import "../utils"
import { ICallRecord } from "./callrecord"
import { ICollector } from "./logger"
import { IGNORE, RxCollector } from "./visualizer"
import * as Rx from "rx"

export let defaultSubjects = {
  Observable: Rx.Observable,
  "Observable.prototype": (<any>Rx.Observable).prototype,
  // "ObservableBase.prototype": (<any> Rx.ObservableBase)['prototype'],
  "AbstractObserver.prototype": <any>Rx.internals.AbstractObserver.prototype,
  "AnonymousObserver.prototype": <any>Rx.AnonymousObserver.prototype,
}

function now() {
  return typeof performance !== "undefined" ? performance.now() : new Date().getTime()
}

/* tslint:disable:interface-name */
export interface Function {
  __originalFunction?: Function | null
  apply(subject: any, args: any[] | IArguments): any
}

let i = 0

export default class Instrumentation {
  public logger: ICollector & RxCollector
  public open: any[] = []
  public stackTraces: boolean = false

  private subjects: { [name: string]: any; }
  private calls: ICallRecord[] = []

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

    let instrumented = <Function>function instrumented(): any {
      let call: ICallRecord = {
        arguments: [].slice.call(arguments, 0),
        childs: [],
        id: i++,
        method: extras["methodName"],
        returned: null,
        stack: self.stackTraces ? new Error().stack : undefined,
        subject: this,
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
      let returned = fn.apply(this, [].map.call(
        arguments,
        instanceLogger.wrapHigherOrder.bind(instanceLogger, call.subject))
      )
      call.returned = returned
      instanceLogger.after(call)

      // Cleanup
      open.pop()
      return returned
    }

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
    let properties: { key: string, name: string, subject: any }[] = Object.keys(this.subjects)
      .map((name: string) => ({ name, subject: this.subjects[name] }))
      .map(({ name, subject }) => Object.keys(subject)
        .map(key => ({ key, name: name as string, subject }))
      )
      .reduce((prev, next) => prev.concat(next), [])

    let methods = properties
      .filter(({ key, subject }) => typeof subject[key] === "function")

    methods.forEach(({ key, name, subject }) => {
      subject[key] = this.instrument(subject[key], {
        methodName: key,
        subjectName: name,
      })
    })
  }

  public teardown(): void {
    let properties: { key: string, name: string, subject: any }[] = Object.keys(this.subjects)
      .map((name: string) => ({ name, subject: this.subjects[name] }))
      .map(({ name, subject }) => Object.keys(subject)
        .map(key => ({ key, name: name as string, subject }))
      )
      .reduce((prev, next) => prev.concat(next), [])

    let methods = properties
      .filter(({ key, subject }) => typeof subject[key] === "function")

    methods.forEach(({ key, subject }) => {
      subject[key] = this.deinstrument(subject[key])
    })
  }
}
