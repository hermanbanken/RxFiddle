import { RxCollector } from "../src/collector/collector"
import { TreeGrapherAdvanced } from "../src/collector/treeReaderAdvanced"
import { TreeCollector as Collector } from "../src/instrumentation/rxjs-4.1.0/collector"
import Instrumentation, { defaultSubjects } from "../src/instrumentation/rxjs-4.1.0/instrumentation"
import { suite } from "mocha-typescript"
import { EdgeType, ISchedulerInfo, ITreeLogger, NodeType } from "../src/oct/oct"

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
    // Collector.reset()
    // this.collector = new Collector()
    // this.instrumentation = new Instrumentation(defaultSubjects, this.collector)
    // this.instrumentation.setup()

    this.logger = new MessageLogger()
    this.collector = new Collector(this.logger)
    this.instrumentation = new Instrumentation(defaultSubjects, this.collector)
    this.instrumentation.setup()
  }

  public after() {
    this.instrumentation.teardown()
  }

  public ensureCollector(arg: any): arg is Collector {
    if (this instanceof Collector) {
      return true
    } else {
      return false
    }
  }

  public rxCheck() {
    if (!this.ensureCollector(this.collector)) {
      throw new Error("RxCollector is no Collector")
    }
  }

  public get rxcollector(): Collector {
    return this.collector as Collector
  }

  public get newcollector(): Collector {
    return this.collector as Collector
  }
}
