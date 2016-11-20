import { ICallRecord } from "./callrecord";
export declare type IEventType = "next" | "error" | "complete" | "subscribe" | "dispose";
export interface IEvent {
    type: IEventType;
    time: number;
}
export declare class Event implements IEvent {
    type: IEventType;
    time: number;
    static fromRecord(record: ICallRecord): IEvent | null;
    constructor(type: IEventType, time: number);
}
export declare class Next<T> extends Event {
    value: T;
    constructor(time: number, value: T);
}
export declare class Error extends Event {
    error: Error;
    constructor(time: number, error: Error);
}
export declare class Complete extends Event {
    constructor(time: number);
}
export declare class Subscribe extends Event {
    constructor(time: number);
}
export declare class Dispose extends Event {
    constructor(time: number);
}
