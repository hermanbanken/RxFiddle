import { StackFrame } from "../utils";
import { Visualizer } from "./visualizer";
export interface ICallRecord {
    id: number | string | null;
    subject: any;
    subjectName: string;
    method: string;
    arguments: IArguments;
    stack?: StackFrame | string;
    time: number;
    returned: any | null;
    parent?: ICallRecord;
    childs: ICallRecord[];
    visualizer?: Visualizer;
}
export declare function callRecordType(record: ICallRecord): "setup" | "subscribe" | "event";
