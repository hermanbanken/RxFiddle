import { RxCollector } from "../src/collector/collector"
import Collector from "../src/collector/logger"
import Instrumentation, { defaultSubjects } from "../src/instrumentation/rxjs-4.1.0/instrumentation"
import { suite } from "mocha-typescript"

@suite
export class InstrumentationTest {

  protected instrumentation: Instrumentation
  protected collector: RxCollector

  public before() {
    // Collector.reset()
    // this.collector = new Collector()
    // this.instrumentation = new Instrumentation(defaultSubjects, this.collector)
    // this.instrumentation.setup()

    this.collector = new Collector()
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
