import { ICallStart } from "./callrecord"
import { formatArguments } from "./logger"

export type IEventType = "next" | "error" | "complete" | "subscribe" | "dispose" | "connect"

export type IEvent = Next<any> | Subscribe | Complete | Error | Dispose | Connect

export class Event {
  public static fromRecord(record: ICallStart): IEvent | null {
    switch (record.method) {
      case "next":
      case "error":
      case "completed":
        return
      case "onNext":
        return new Next(record.time, record.tick, record.arguments[0])
      case "onError":
      case "fail":
        return new Error(record.time, record.tick, new ErrorInstance(record.arguments[0]))
      case "onCompleted":
        return new Complete(record.time, record.tick)
      case "connect":
        return new Connect(record.time, record.tick)
      case "subscribe":
      case "_subscribe":
      case "__subscribe":
        return new Subscribe(record.time, record.tick)
      case "dispose":
        return new Dispose(record.time, record.tick)
      default: break
      // console.log("Unknown event", record)
    }
  }
  public static fromJson(input: any): IEvent | null {
    switch (input.type) {
      case "next": return new Next(input.time, input.value, input.tick)
      case "error": return new Error(input.time, input.error, input.tick)
      case "complete": return new Complete(input.time, input.tick)
      case "subscribe": return new Subscribe(input.time, input.tick)
      case "dispose": return new Dispose(input.time, input.tick)
      default: return null
    }
  }
  constructor(public type: IEventType, public time: number, public tick: number) { }
}

export class Next<T> extends Event {
  public value: string
  public type: "next"
  constructor(time: number, tick: number, value: T) {
    super("next", time, tick)
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
  constructor(time: number, tick: number, error: ErrorInstance) {
    super("error", time, tick)
    this.error = error
  }
}

export class Complete extends Event {
  public type: "complete"
  constructor(time: number, tick: number) { super("complete", time, tick) }
}

export class Subscribe extends Event {
  public type: "subscribe"
  constructor(time: number, tick: number) { super("subscribe", time, tick) }
}

export class Connect extends Event {
  public type: "connect"
  constructor(time: number, tick: number) { super("connect", time, tick) }
}

export class Dispose extends Event {
  public type: "dispose"
  constructor(time: number, tick: number) { super("dispose", time, tick) }
}
