import "../utils";
import { Visualizer } from "./visualizer";

export interface ICallRecord {
  id: number | string | null;
  subject: any;
  subjectName: string;
  method: string;
  arguments: IArguments;
  stack: StackFrame | string;
  time: number;
  returned: any | null;
  parent?: ICallRecord;
  childs: ICallRecord[];
  visualizer?: Visualizer;
}

type CallRecordType = "setup" | "subscribe" | "event";

export function callRecordType(record: ICallRecord) {
  if (record.subjectName === "Observable" || record.subjectName === "Observable.prototype" || record.subjectName === "ObservableBase.prototype") {
    if (record.method === "subscribe" || record.method === "_subscribe") {
      return "subscribe";
    }
    return "setup";
  } else {
    return "event";
  }
}