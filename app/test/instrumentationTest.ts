import { RxCollector } from "../src/collector/collector"
import { TreeCollector as Collector } from "../src/instrumentation/rxjs-4.1.0/collector"
import Instrumentation, { defaultSubjects } from "../src/instrumentation/rxjs-4.1.0/instrumentation"
import { EdgeType, ISchedulerInfo, ITreeLogger, NodeType } from "../src/oct/oct"
import { MessageLogger } from "./messageLogger"
import { suite } from "mocha-typescript"

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
