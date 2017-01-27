import { DataSource } from "../visualization";
import { AddEvent, AddObservable, AddStackFrame, AddSubscription, ICollector } from "./logger";
import * as Rx from "rx";
export default class JsonCollector implements ICollector, DataSource {
    data: (AddStackFrame | AddObservable | AddSubscription | AddEvent)[];
    dataObs: Rx.Observable<any>;
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
    readonly length: number;
    private subject;
    private url;
    constructor(url: string);
    getLog(id: number): AddObservable | AddSubscription | AddEvent | AddStackFrame;
    getStack(id: number): AddStackFrame | null;
    getObservable(id: number): AddObservable | null;
    getSubscription(id: number): AddSubscription | null;
    getEvent(id: number): AddEvent | null;
    write: (data: any) => void;
    private receive(v);
    private merge<T>(fresh, ...inputs);
}
