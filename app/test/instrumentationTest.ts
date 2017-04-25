import { RxCollector } from "../src/collector/collector"
import { TreeCollector as Collector } from "../src/instrumentation/rxjs-4.1.0/collector"
import Instrumentation, { defaultSubjects } from "../src/instrumentation/rxjs-4.1.0/instrumentation"
import { EdgeType, ISchedulerInfo, ITreeLogger, NodeType } from "../src/oct/oct"
import { suite } from "mocha-typescript"

export class MessageLogger implements ITreeLogger {
  public messages: any = []
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
  public reset() {
    this.post("reset")
  }
  private post = (m: any) => this.messages.push(m)
}


@suite
export class InstrumentationTest {

  protected instrumentation: Instrumentation
  protected collector: RxCollector
  protected logger: MessageLogger

  public before() {
    this.logger = new MessageLogger()
    this.collector = new Collector(this.logger)
    this.instrumentation = new Instrumentation(defaultSubjects, this.collector)
    this.instrumentation.setup()
  }

  public after() {
    this.instrumentation.teardown()
  }

  public get rxcollector(): Collector {
    return this.collector as Collector
  }

  public get newcollector(): Collector {
    return this.collector as Collector
  }
}
