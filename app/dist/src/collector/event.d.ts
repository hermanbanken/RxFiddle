import { ICallStart } from "./callrecord";
export declare type IEventType = "next" | "error" | "complete" | "subscribe" | "dispose";
export declare type IEvent = Next<any> | Subscribe | Complete | Error | Dispose;
export declare class Event {
    type: IEventType;
    time: number;
    static fromRecord(record: ICallStart): IEvent | null;
    static fromJson(input: any): IEvent | null;
    constructor(type: IEventType, time: number);
}
export declare class Next<T> extends Event {
    value: string;
    type: "next";
    constructor(time: number, value: T);
}
export declare class Error extends Event {
    error: Error;
    type: "error";
    constructor(time: number, error: Error);
}
export declare class Complete extends Event {
    type: "complete";
    constructor(time: number);
}
export declare class Subscribe extends Event {
    type: "subscribe";
    constructor(time: number);
}
export declare class Dispose extends Event {
    type: "dispose";
    constructor(time: number);
}
