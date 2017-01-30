import { StackFrame } from "../utils";
import { AddObservable, AddSubscription } from "./logger";
import * as snabbdom from "snabbdom";
import { VNode } from "snabbdom/vnode";
export declare function partition<T>(array: T[], fn: (item: T, index?: number, list?: T[]) => boolean): [T[], T[]];
export declare class RxFiddleNode {
    id: string;
    name: string;
    location: StackFrame;
    static wrap(inner: RxFiddleNode, outer: RxFiddleNode): RxFiddleNode;
    instances: ({
        id: number;
    })[];
    observers: [{
        id: number;
    }, {
        id: number;
    }, any[]][];
    width: number;
    height: number;
    x: number;
    y: number;
    hoover: boolean;
    highlightIndex?: number;
    highlightId?: number;
    rendered: VNode;
    nested: RxFiddleNode[];
    private count;
    constructor(id: string, name: string, location: StackFrame);
    addObservable(instance: AddObservable): this;
    readonly locationText: string;
    addObserver(observable: AddObservable, observer: AddSubscription): [{
        id: number;
    }, {
        id: number;
    }, any[]];
    size(): {
        w: number;
        h: number;
    };
    setHoover(enabled: boolean): this;
    layout(): void;
    setHighlight(index?: number): this;
    setHighlightId(patch: snabbdom.PatchFunction, id?: number): this;
    render(patch: snabbdom.PatchFunction, showIds?: boolean): VNode;
    private line(i);
}
