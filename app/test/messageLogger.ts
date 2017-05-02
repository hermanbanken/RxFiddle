import { EdgeType, ISchedulerInfo, ITreeLogger, NodeType } from "../src/oct/oct"

export class MessageLogger implements ITreeLogger {
  public messages: any = []
  constructor() {
    if (typeof window !== "undefined") {
      this.messages = (window as any).messages = []
    }
  }
  public addNode(id: string, type: NodeType, scheduler?: ISchedulerInfo): void {
    this.post({ id, type, scheduler })
  }
  public addMeta(id: string, meta: any): void {
    this.post({ id, meta })
  }
  public addEdge(v: string, w: string, type: EdgeType, meta?: any): void {
    this.post({ v, w, type, meta })
  }
  public addScheduler(id: string, scheduler: ISchedulerInfo): void {
    this.post({ id, scheduler })
  }
  public addContraction(id: string, nodes: string[]): void {
    this.post({ id, contract: nodes })
  }
  public reset() {
    this.post("reset")
  }
  private post = (m: any) => this.messages.push(m)
}
