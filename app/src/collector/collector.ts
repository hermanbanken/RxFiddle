import { jsonify } from "../../test/utils"
import { ICallRecord, ICallStart, callRecordType } from "./callrecord"
import { Event } from "./event"
import { Edge, EventLabel, Message, Node, NodeLabel, ObserverStorage, formatArguments } from "./logger"
import * as Rx from "rx"
import TypedGraph from "./typedgraph"
import { ObserverTree, ObservableTree, SubjectTree, IObservableTree, IObserverTree } from "../oct/oct"

type Group = {
  call: ICallStart
  id: number
  used: boolean
}

function isStream(v: Rx.Observable<any>): boolean {
  return v instanceof (Rx as any).Observable
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

function keys<T, K extends keyof T>(obj: T): K[] {
  return Object.keys(obj) as any as K[]
}

function existsSomewhereIn(obj: any, search: any[]): string {
  let searched: any[] = []
  let depth = 0
  let toBeSearched = keys(obj).map(key => ({ key, value: obj[key] }))
  while (toBeSearched.length && depth++ < 3) {
    let found = toBeSearched.find(v => search.indexOf(v.value) >= 0)
    if (found) { return found.key }
    searched.push(...toBeSearched.map(pair => pair.value))
    toBeSearched = toBeSearched
      .filter(pair => typeof pair.value === "object" && pair.value !== null)
      .flatMap(p => keys(p.value).map(k => ({ key: p.key + "." + k, value: p.value[k] })))
      .filter(pair => searched.indexOf(pair.value) < 0)
  }
  return
}

export interface RxCollector {
  wrapHigherOrder<T>(subject: Rx.Observable<any>, fn: Function): (arg: T) => T
  before(record: ICallStart, parents?: ICallStart[]): this
  after(record: ICallRecord): void
  schedule(scheduler: Rx.IScheduler, method: string, action: Function, state: any): void
}

