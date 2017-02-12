import { StackFrame } from "../utils";
import { ICallRecord, ICallStart } from "./callrecord";
import Collector from "./collector";
import { IEvent } from "./event";
import * as Rx from "rx";
export default Collector;
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
        label: SubscriptionLinkLabel | SubscriptionHigherOrderLinkLabel | ObservableTimingLabel;
    };
};
export declare type NodeLabel = {
    group?: number;
    groups?: number[];
    type: "label";
    label: SubcriptionLabel | ObservableLabel | EventLabel;
    node: number;
};
export declare type ObservableTimingLabel = {
    time: number;
    type: "observable link";
};
export declare type SubcriptionLabel = {
    id: number;
    type: "subscription";
};
export declare type SubscriptionLinkLabel = {
    type: "subscription sink";
    v: number;
    w: number;
};
export declare type SubscriptionHigherOrderLinkLabel = {
    type: "higherOrderSubscription sink";
    id: number;
    parent: number;
};
export declare type EventLabel = {
    event: IEvent;
    subscription: number;
    type: "event";
};
export declare type ObservableLabel = {
    args: any;
    method: string;
    type: "observable";
};
export declare type Message = Node | Edge | NodeLabel;
