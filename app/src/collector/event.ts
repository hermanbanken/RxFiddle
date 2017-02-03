import { ICallStart } from "./callrecord"
import { formatArguments } from "./logger"

export type IEventType = "next" | "error" | "complete" | "subscribe" | "dispose"

export type IEvent = Next<any> | Subscribe | Complete | Error | Dispose

export class Event {
  public static fromRecord(record: ICallStart): IEvent | null {
    switch (record.method) {
      case "next":
      case "error":
      case "completed":
        return
      case "onNext":
        return new Next(record.time, record.arguments[0])
      case "onError":
      case "fail":
        return new Error(record.time, record.arguments[0])
      case "onCompleted":
        return new Complete(record.time)
      case "subscribe":
      case "_subscribe":
      case "__subscribe":
        return new Subscribe(record.time)
      case "dispose":
        return new Dispose(record.time)
      default: break
      // console.log("Unknown event", record)
    }
  }
  public static fromJson(input: any): IEvent | null {
    switch (input.type) {
      case "next": return new Next(input.time, input.value)
      case "error": return new Error(input.time, input.error)
      case "complete": return new Complete(input.time)
      case "subscribe": return new Subscribe(input.time)
      case "dispose": return new Dispose(input.time)
      default: return null
    }
  }
  constructor(public type: IEventType, public time: number) { }
}

export class Next<T> extends Event {
  public value: string
  public type: "next"
  constructor(time: number, value: T) {
    super("next", time)
    this.value = formatArguments([value])
  }
}

export class Error extends Event {
  public error: Error
  public type: "error"
  constructor(time: number, error: Error) {
    super("error", time)
    this.error = error
  }
}

export class Complete extends Event {
  public type: "complete"
  constructor(time: number) { super("complete", time) }
}

export class Subscribe extends Event {
  public type: "subscribe"
  constructor(time: number) { super("subscribe", time) }
}

export class Dispose extends Event {
  public type: "dispose"
  constructor(time: number) { super("dispose", time) }
}
