import { ICallRecord } from "./callrecord";

export type IEventType = "next" | "error" | "complete" | "subscribe" | "dispose";

export interface IEvent {
  type: IEventType;
  time: number;
}

export class Event implements IEvent {
  constructor(public type: IEventType, public time: number) { }
  static fromRecord(record: ICallRecord): IEvent {
    switch (record.method) {
      case "next":
      case "onNext":
        return new Next(record.time, record.arguments[0]);
      case "error":
      case "onError":
        return new Error(record.time, record.arguments[0]);
      case "completed":
      case "onCompleted":
        return new Complete(record.time);
      case "subscribe":
        return new Subscribe(record.time);
      case "dispose":
        return new Dispose(record.time);
      default:
        console.log("Unknown event", record);
    }
  }
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
