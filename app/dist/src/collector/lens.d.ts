import { Complete, Error, IEvent, Next } from "./event";
import Collector, { AddObservable, AddSubscription } from "./logger";
export interface ISubscriptionLens<T> {
    events(): IEvent[];
    nexts(): Next<T>[];
    completes(): Complete[];
    errors(): Error[];
    all(): AddSubscription[];
    scoping(): ISubscriptionLens<T>;
}
export interface IObservableLens<T> {
    all(): AddObservable[];
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
export declare function lens<T>(collector: Collector): ILens<T>;
