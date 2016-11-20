import { ICallRecord } from "./callrecord"

export type IEventType = "next" | "error" | "complete" | "subscribe" | "dispose"

export interface IEvent {
  type: IEventType
  time: number
}

export class Event implements IEvent {
  public static fromRecord(record: ICallRecord): IEvent | null {
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
  constructor(public type: IEventType, public time: number) { }
}

export class Next<T> extends Event {
  constructor(time: number, public value: T) {
    super("next", time);
  }
}

export class Error extends Event {
  constructor(time: number, public error: Error) {
    super("error", time)
  }
}

export class Complete extends Event {
  constructor(time: number) { super("complete", time) }
}

export class Subscribe extends Event {
  constructor(time: number) { super("subscribe", time) }
}

export class Dispose extends Event {
  constructor(time: number) { super("dispose", time) }
}
