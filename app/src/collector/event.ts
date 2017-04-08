import { ICallStart } from "./callrecord"
import { formatArguments } from "./logger"

export type IEventType = "next" | "error" | "complete" | "subscribe" | "dispose" | "connect"

export type IEvent = Next<any> | Subscribe | Complete | Error | Dispose | Connect

export type Timing = {
  scheduler: string
  clocks: { [id: string]: number }
}

export class Event {
  public static fromRecord(record: ICallStart, timing: Timing): IEvent | null {
    switch (record.method) {
      case "next":
      case "error":
      case "completed":
        return
      case "onNext":
        return new Next(timing, record.arguments[0])
      case "onError":
      case "fail":
        return new Error(timing, new ErrorInstance(record.arguments[0]))
      case "onCompleted":
        return new Complete(timing)
      case "connect":
        return new Connect(timing)
      case "subscribe":
      case "_subscribe":
      case "__subscribe":
        return new Subscribe(timing)
      case "dispose":
        return new Dispose(timing)
      default: break
      // console.log("Unknown event", record)
    }
  }
  public static fromJson(input: any): IEvent | null {
    switch (input.type) {
      case "next": return new Next(input.timing, input.value)
      case "error": return new Error(input.timing, input.error)
      case "complete": return new Complete(input.timing)
      case "subscribe": return new Subscribe(input.timing)
      case "dispose": return new Dispose(input.timing)
      default: return null
    }
  }
  constructor(public type: IEventType, public timing: Timing) { }
}

export class Next<T> extends Event {
  public value: string
  public type: "next"
  constructor(timing: Timing, value: T) {
    super("next", timing)
    this.value = formatArguments([value])
  }
}

export class ErrorInstance {
  public name: string
  public message: string
  public stack: string
  public constructor(someError: SyntaxError) {
    this.name = someError.name
    this.message = someError.message
    this.stack = someError.stack
  }
}

export class Error extends Event {
  public error: ErrorInstance
  public type: "error"
  constructor(timing: Timing, error: ErrorInstance) {
    super("error", timing)
    this.error = error
  }
}

export class Complete extends Event {
  public type: "complete"
  constructor(timing: Timing) { super("complete", timing) }
}

export class Subscribe extends Event {
  public type: "subscribe"
  constructor(timing: Timing) { super("subscribe", timing) }
}

export class Connect extends Event {
  public type: "connect"
  constructor(timing: Timing) { super("connect", timing) }
}

export class Dispose extends Event {
  public type: "dispose"
  constructor(timing: Timing) { super("dispose", timing) }
}
