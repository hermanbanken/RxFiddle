import { RxFiddleNode } from "./node";
export interface IOptions {
    fill?: string;
    dashed?: boolean;
    stroke?: string;
    "stroke-width"?: number;
    "marker-end"?: string;
    "marker-start"?: string;
}
export declare type EdgeType = "structure" | "subscription" | "higherorder";
export declare class RxFiddleEdge {
    from: RxFiddleNode;
    to: RxFiddleNode;
    type: EdgeType;
    points: {
        x: number;
        y: number;
    }[];
    options: IOptions;
    constructor(from: RxFiddleNode, to: RxFiddleNode, type: EdgeType, options?: IOptions);
    render(): any;
}
