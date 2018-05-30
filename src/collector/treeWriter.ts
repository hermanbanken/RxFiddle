import {
  EdgeType,
  ISchedulerInfo,
  ITreeLogger,
  NodeType,
} from "../oct/oct"

export class TreeWriter implements ITreeLogger {
  public messages: any[] = []
  public addNode(id: string, type: NodeType, scheduler?: ISchedulerInfo): void {
    this.messages.push({ id, type, scheduler })
  }
  public addMeta(id: string, meta: any): void {
    this.messages.push({ id, meta })
  }
  public addEdge(v: string, w: string, type: EdgeType, meta?: any): void {
    this.messages.push({ v, w, type, meta })
  }
  public addScheduler(id: string, scheduler: ISchedulerInfo): void {
    this.messages.push({ id, scheduler })
  }
  public addContraction(id: string, nodes: string[]): void {
    this.messages.push({ id, contract: nodes })
  }
}

export default TreeWriter
