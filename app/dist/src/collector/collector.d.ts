import { ICallRecord, ICallStart } from "./callrecord";
import { Message, ObserverStorage } from "./logger";
import * as Rx from "rx";
export interface RxCollector {
    wrapHigherOrder<T>(subject: Rx.Observable<any>, fn: Function): (arg: T) => T;
    before(record: ICallStart, parents?: ICallStart[]): this;
    after(record: ICallRecord): void;
}
export default class NewCollector implements RxCollector {
    static collectorId: number;
    static reset(): void;
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
    private findRootObserverId<T>(observer);
}
