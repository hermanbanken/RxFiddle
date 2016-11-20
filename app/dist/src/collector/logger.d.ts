import { StackFrame } from "../utils";
import { ICallRecord } from "./callrecord";
import { IEvent } from "./event";
import { ILens } from "./lens";
import * as Rx from "rx";
export declare function instanceAddSubscription(input: any): boolean;
declare module "rx" {
    interface Observable<T> {
        source?: Observable<any>;
    }
    interface Observer<T> {
        source?: Observable<any>;
        o?: Observer<any>;
        parent?: Observer<any>;
    }
}
export declare class AddStackFrame {
    id: number;
    stackframe: StackFrame;
}
export declare class AddObservable {
    id: number;
    callParent?: number;
    parents?: number[];
    method?: string;
    stack?: number;
    arguments?: IArguments;
    inspect(depth: number, opts?: any): string;
    toString(): string;
}
export interface AddSubscription {
    id: number;
    observableId: number;
    sinks?: number[];
    scopeId?: number;
}
export declare class AddEvent {
    subscription: number;
    event: IEvent;
}
export interface RxCollector {
    before(record: ICallRecord, parents?: ICallRecord[]): Collector;
    after(record: ICallRecord): void;
    wrapHigherOrder<T>(subject: Rx.Observable<any>, fn: Function): (arg: T) => T;
}
export interface ICollector {
    indices: {
        observables: {
            [id: number]: {
                childs: number[];
                subscriptions: number[];
            };
        };
        stackframes: {
            [source: string]: number;
        };
        subscriptions: {
            [id: number]: {
                events: number[];
                scoping: number[];
            };
        };
    };
    length: number;
    getLog(id: number): AddObservable | AddSubscription | AddEvent | AddStackFrame;
    getStack(id: number): AddStackFrame | null;
    getObservable(id: number): AddObservable | null;
    getSubscription(id: number): AddSubscription | null;
    getEvent(id: number): AddEvent | null;
}
export default class Collector implements RxCollector, ICollector {
    static collectorId: number;
    static reset(): void;
    collectorId: number;
    hash: string;
    indices: {
        observables: {
            [id: number]: {
                childs: number[];
                subscriptions: number[];
                inner: number[];
            };
        };
        stackframes: {
            [source: string]: number;
        };
        subscriptions: {
            [id: number]: {
                events: number[];
                scoping: number[];
            };
        };
    };
    data: (AddStackFrame | AddObservable | AddSubscription | AddEvent)[];
    private queue;
    constructor();
    lens(): ILens<{}>;
    before(record: ICallRecord, parents?: ICallRecord[]): Collector;
    after(record: ICallRecord): void;
    readonly length: number;
    getLog(id: number): AddObservable | AddSubscription | AddEvent | AddStackFrame;
    getObservable(id: number): AddObservable | null;
    getSubscription(id: number): AddSubscription | null;
    getStack(id: number): AddStackFrame | null;
    getEvent(id: number): AddEvent | null;
    wrapHigherOrder(subject: Rx.Observable<any>, fn: Function | any): Function | any;
    private pretty(o);
    private proxy<T>(target);
    private stackFrame(record);
    private observableForObserver(observer);
    private enrichWithCall(node, record, observable);
    private observable(obs, record?);
    /**
     * AnonymousObservable uses AnonymousObserver to subscribe, which does not list its sinks.
     * We can guess though, that the previously created observer is the sink
     */
    private heuristicallyGetSinkSubscribers();
    private subscription(sub, observable, scopeId?, sink?);
    private id<T>(obs);
}
