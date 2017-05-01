import { ICallRecord, ICallStart } from "./callrecord"
import * as Rx from "rx"

type Group = {
  call: ICallStart
  id: number
  used: boolean
}

export function isObserver<T>(v: any): v is Rx.Observer<T> & any {
  return typeof v === "object" && v !== null && typeof v.onNext === "function"
}

export function isDisposable(v: any): v is Rx.Subscription & any {
  return typeof v === "object" && v !== null && typeof v.dispose === "function"
}

export function isObservable<T>(v: any): v is Rx.Observable<T> {
  return typeof v === "object" && v !== null && typeof v.subscribe === "function"
}

export function isScheduler(v: any): v is Rx.IScheduler & any {
  return typeof v === "object" && v !== null && typeof v.now === "function" && typeof v.schedule === "function"
}

export function elvis(item: any, path: string[]): any[] {
  let next = typeof item === "object" && path.length && path[0] in item ? item[path[0]] : undefined
  if (path.length > 1) {
    return elvis(next, path.slice(1))
  } else if (typeof next !== "undefined") {
    return [next]
  } else {
    return []
  }
}

export interface RxCollector {
  wrapHigherOrder?<T>(subject: ICallRecord, fn: Function): (arg: T) => T
  before(record: ICallStart, parents?: ICallStart[]): this
  after(record: ICallRecord): void
  schedule(scheduler: any, method: string, action: Function, state: any): void
}
