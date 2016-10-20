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