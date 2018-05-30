import { ICallRecord, ICallStart } from "./callrecord"

export interface RxCollector {
  wrapHigherOrder?<T>(subject: ICallRecord, fn: Function): (arg: T) => T
  before(record: ICallStart, parents?: ICallStart[]): this
  after(record: ICallRecord): void
  schedule(scheduler: any, method: string, action: Function, state: any): void
}
