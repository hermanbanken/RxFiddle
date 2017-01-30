import { StackFrame } from "../utils";
import { ICallRecord, ICallStart } from "./callrecord";
import { IEvent } from "./event";
import { ILens } from "./lens";
import * as Rx from "rx";
export declare function formatArguments(args: IArguments | any[]): string;
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
    kind: "stackframe";
    id: number;
    stackframe: StackFrame;
    parent: number;
}
export declare class AddStructureEntry {
    kind: "observable";
    id: number;
    parents?: number[];
    method?: string;
}
export declare class AddObservable {
    kind: "observable";
    id: number;
    callParent?: number;
    parents?: number[];
    method?: string;
    stack?: number;
    arguments?: IArguments;
    inspect(depth: number, opts?: any): string;
    toString(): string;
}
export declare class AddSubscriptionImpl implements AddSubscription {
    id: number;
    observableId: number;
    sinks?: number[];
    scopeId?: number;
    kind: "subscription";
    inspect(depth: number, opts?: any): string;
    toString(): string;
}
export interface AddSubscription {
    kind: "subscription";
    id: number;
    observableId: number;
    sinks?: number[];
    scopeId?: number;
}
export declare class AddEvent {
    kind: "event";
    subscription: number;
    event: IEvent;
}
export interface RxCollector {
    before(record: ICallStart, parents?: ICallStart[]): this;
    after(record: ICallRecord): void;
    wrapHigherOrder<T>(subject: Rx.Observable<any>, fn: Function): (arg: T) => T;
}
export declare type All = AddStackFrame | AddObservable | AddSubscription | AddEvent | AddStructureEntry;
export interface ICollector {
    data: All[];
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
    getLog(id: number): All;
    getStack(id: number): AddStackFrame | null;
    getObservable(id: number): AddObservable | null;
    getSubscription(id: number): AddSubscription | null;
    getEvent(id: number): AddEvent | null;
}
export declare class ObserverSet {
    observable: number;
    ids: number[];
    relations: number[];
    tags: {
        [id: number]: string[];
    };
    constructor(observable: number);
    inspect(depth: number, opts?: any): string;
    toString(): string;
}
export declare class ObserverStorage {
    sets: ObserverSet[];
    observableToSets: {
        [id: number]: ObserverSet[];
    };
    observerToSet: {
        [id: number]: number;
    };
    observerToObservable: {
        [id: number]: number;
    };
    set(forObservable: number, forObserver: number): {
        addCore: (observer: number, ...tags: string[]) => void;
        addRelation: (observer: number, ...tags: string[]) => void;
    };
}
export declare type Node = {
    id: number;
    type: "node";
    node: {
        name: string;
    };
};
export declare type Edge = {
    type: "edge";
    edge: {
        v: number;
        w: number;
        label: {};
    };
};
export declare type NodeLabel = {
    group?: number;
    groups?: number[];
    type: "label";
    label: {};
    node: number;
};
export declare type Message = Node | Edge | NodeLabel;
export declare class NewCollector implements RxCollector {
    collectorId: number;
    hash: string;
    messages: Message[];
    observerStorage: ObserverStorage;
    private groups;
    private groupId;
    constructor();
    observerToObs(observer: number | any): number;
    before(record: ICallStart, parents?: ICallStart[]): this;
    after(record: ICallRecord): void;
    wrapHigherOrder(subject: Rx.Observable<any>, fn: Function | any): Function | any;
    private proxy<T>(target);
    private tags(...items);
    private id<T>(obs);
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
    data: All[];
    allRecords: ICallStart[];
    trace: any[];
    private queue;
    private groups;
    constructor();
    lens(): ILens<{}>;
    before(record: ICallStart, parents?: ICallRecord[]): this;
    after(record: ICallRecord): void;
    readonly length: number;
    getLog(id: number): All;
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
