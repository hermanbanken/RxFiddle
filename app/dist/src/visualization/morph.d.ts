import { VNode } from "snabbdom/vnode";
declare module "snabbdom/vnode" {
    interface VNodeData {
        morph?: any;
        attrs?: any;
    }
}
declare let morphModule: {
    prepare: (oldVNode: VNode, vnode: VNode) => void;
    update: (oldVNode: VNode, vnode: VNode) => void;
};
export default morphModule;
export declare class Point {
    x: number;
    y: number;
    constructor(x: number, y: number);
    toString(): string;
    delta(other: Point): {
        dx: number;
        dy: number;
    };
}
export declare class Path {
    static parse(path: string): Path;
    segments: Segment[];
    constructor(segments: Segment[]);
    toString(): string;
    expand(adjust: number): Path;
}
export declare class Segment {
    static parsePath(path: string): Segment[];
    static addOrConcat(list: Segment[], next: Segment): Segment[];
    modifier: string;
    points: number[];
    readonly x: number;
    readonly y: number;
    readonly ps: Point[];
    readonly isAbsolute: boolean;
    readonly deltas: {
        dx: number;
        dy: number;
    }[];
    readonly ratios: number[];
    readonly isStraight: boolean;
    readonly multiplicity: number;
    readonly slack: number;
    constructor(modifier: string, points: number[]);
    expand(adjust: number): Segment;
    toString(): string;
    combine(other: Segment): Segment[];
}
