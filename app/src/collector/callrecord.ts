import "../utils";

export interface ICallRecord {
  id: number | string | null;
  subject: any;
  subjectName: string;
  method: string;
  arguments: any[];
  stack: StackFrame | string;
  time: number;
  returned: any | null;
  parent?: ICallRecord;
  childs: ICallRecord[];
}

type CallRecordType = "setup" | "subscribe" | "event";

export function callRecordType(record: ICallRecord) {
  if (record.subjectName === "Observable" || record.subjectName === "Observable.prototype") {
    if (record.method === "subscribe") {
      return "subscribe";
    }
    return "setup";
  } else {
    return "event";
  }
}