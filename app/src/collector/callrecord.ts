import { StackFrame } from "../utils"
import { Visualizer } from "./visualizer"

export type ICallRecord = ICallStart & ICallEnd

export interface ICallStart {
  id: number | string | null
  subject: any
  subjectName: string
  method: string
  arguments: IArguments
  stack?: StackFrame | string
  time: number
  parent?: ICallStart
  childs: (ICallRecord | ICallStart)[]
  visualizer?: Visualizer
}

export interface ICallEnd {
  returned: any | null
}

type CallRecordType = "setup" | "subscribe" | "event"

export function callRecordType(record: ICallStart) {
  if (record.subjectName === "Observable" ||
    record.subjectName === "Observable.prototype" ||
    record.subjectName === "ObservableBase.prototype" ||
    record.subjectName.indexOf("Observable") >= 0
  ) {
    if (record.method === "subscribe" || record.method === "_subscribe" || record.method === "__subscribe") {
      return "subscribe"
    }
    return "setup"
  } else {
    return "event"
  }
}
