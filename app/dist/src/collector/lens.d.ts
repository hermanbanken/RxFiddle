import { GraphEdge, GraphNode } from "../visualization";
import { Complete, Error, IEvent, Next } from "./event";
import Collector from "./logger";
import TypedGraph from "../collector/typedgraph";
export interface Observable {
    id: string;
    labels: {
        name: string;
        method: string;
        args: string;
    }[];
}
export interface Subscription {
    events: IEvent[];
}
export interface ISubscriptionLens<T> {
    events(): IEvent[];
    nexts(): Next<T>[];
    completes(): Complete[];
    errors(): Error[];
    all(): Subscription[];
    scoping(): ISubscriptionLens<T>;
}
export interface IObservableLens<T> {
    all(): Observable[];
    childs(): IObservableLens<T>;
    each(): IObservableLens<T>[];
    internals(): IObservableLens<T>;
    subscriptions(): ISubscriptionLens<T>;
}
export interface ILens<T> {
    all(): IObservableLens<T>;
    roots(): IObservableLens<T>;
    find(selector: string | number): IObservableLens<T>;
}
export declare class SubscriptionLens {
    lens: Lens;
    constructor(lens: Lens);
}
export declare class Lens {
    selectors: LensAction[];
    static sinks(): Lens;
    static find(selector: string): Lens;
    constructor(selectors?: LensAction[]);
    filter(selector: string): Lens;
    subscriptions(): SubscriptionLens;
    execute(collector: Collector): Observable[];
    protected graphs(collector: Collector): {
        main: TypedGraph<GraphNode, GraphEdge>;
        subscriptions: TypedGraph<number, undefined>;
    };
}
export declare type LensAction = Find | Up | Down | Sinks;
export interface Up {
    type: "up";
}
export interface Down {
    type: "down";
}
export interface Sinks {
    type: "sinks";
}
export interface Find {
    type: "find";
    selector: string;
}
