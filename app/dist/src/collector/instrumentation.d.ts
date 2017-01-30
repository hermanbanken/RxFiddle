import "../utils";
import { RxCollector } from "./visualizer";
import * as Rx from "rx";
export declare let defaultSubjects: {
    Observable: Rx.ObservableStatic;
    "Observable.prototype": any;
    "ConnectableObservable.prototype": any;
    "ObservableBase.prototype": any;
    "AbstractObserver.prototype": any;
    "AnonymousObserver.prototype": any;
    "Subject.prototype": any;
};
export declare const HASH = "__hash";
export declare const IGNORE = "__ignore";
export interface Function {
    caller?: Function;
    __originalFunction?: Function | null;
    apply(subject: any, args: any[] | IArguments): any;
}
export default class Instrumentation {
    logger: RxCollector;
    open: any[];
    stackTraces: boolean;
    private subjects;
    private calls;
    private prototypes;
    constructor(subjects: {
        [name: string]: any;
    }, logger: RxCollector);
    instrument(fn: Function, extras: {
        [key: string]: string;
    }): Function;
    deinstrument(fn: Function): Function;
    setup(): void;
    setupPrototype(prototype: any, name?: string): void;
    teardown(): void;
}
