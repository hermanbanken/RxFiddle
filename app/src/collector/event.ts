// tslint:disable:no-constructor-vars
import { ICallStart } from "./callrecord"
import { formatArguments } from "./logger"

export type IEventType = "next" | "error" | "complete" | "subscribe" | "dispose" | "connect"

export type IEvent = Next<any> | Subscribe | Complete | Error | Dispose | Connect

export type Timing = {
  scheduler: string
  clocks: { [id: string]: number }
}

export class Event {
  public static fromRecord(record: ICallStart, timing: Timing, source?: string): IEvent | null {
    switch (record.method) {
      case "next":
      case "error":
      case "completed":
        return
      case "onNext":
        return new Next(timing, record.arguments[0], source)
      case "onError":
      case "fail":
        return new Error(timing, new ErrorInstance(record.arguments[0]), source)
      case "onCompleted":
        return new Complete(timing, source)
      case "connect":
        return new Connect(timing, source)
      case "subscribe":
      case "_subscribe":
      case "__subscribe":
        return new Subscribe(timing, source)
      case "dispose":
        return new Dispose(timing, source)
      default: break
      // console.log("Unknown event", record)
    }
  }
  public static fromJson(input: any): IEvent | null {
    switch (input.type) {
      case "next": return new Next(input.timing, input.value, input.source)
      case "error": return new Error(input.timing, input.error, input.source)
      case "complete": return new Complete(input.timing, input.source)
      case "subscribe": return new Subscribe(input.timing, input.source)
      case "dispose": return new Dispose(input.timing, input.source)
      default: return null
    }
  }
  constructor(public type: IEventType, public timing: Timing, public source?: string) { }
}

export class Next<T> extends Event {
  public value: string
  public type: "next"
  constructor(timing: Timing, value: T, source?: string) {
    super("next", timing, source)
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
  constructor(timing: Timing, error: ErrorInstance, source?: string) {
    super("error", timing, source)
    this.error = error
  }
}

export class Complete extends Event {
  public type: "complete"
  constructor(timing: Timing, source?: string) { super("complete", timing, source) }
}

export class Subscribe extends Event {
  public type: "subscribe"
  constructor(timing: Timing, source?: string) { super("subscribe", timing, source) }
}

export class Connect extends Event {
  public type: "connect"
  constructor(timing: Timing, source?: string) { super("connect", timing, source) }
}

export class Dispose extends Event {
  public type: "dispose"
  constructor(timing: Timing, source?: string) { super("dispose", timing, source) }
}
