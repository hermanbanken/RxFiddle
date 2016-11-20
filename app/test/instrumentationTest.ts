import Instrumentation, { defaultSubjects } from "../src/collector/instrumentation"
import Collector from "../src/collector/logger"
import { suite } from "mocha-typescript"

@suite
export class InstrumentationTest {

  protected instrumentation: Instrumentation
  protected collector: Collector

  public before() {
    Collector.reset()
    this.collector = new Collector()
    this.instrumentation = new Instrumentation(defaultSubjects, this.collector)
    this.instrumentation.setup()
  }

  public after() {
    this.instrumentation.teardown()
  }
}
