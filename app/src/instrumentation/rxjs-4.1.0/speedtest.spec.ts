import { TreeWriter } from "../../collector/treeReader"
import { TreeCollector } from "./collector"
import Instrumentation, { defaultSubjects } from "./instrumentation"
import { suite, test } from "mocha-typescript"
import * as Rx from "rx"

@suite
export default class SpeedTest {

  protected instrumentation: Instrumentation
  protected collector: TreeCollector
  protected writer: TreeWriter

  public runBefore() {
    this.writer = new TreeWriter()
    this.collector = new TreeCollector(this.writer)
    this.instrumentation = new Instrumentation(defaultSubjects, this.collector)
    this.instrumentation.setup()
  }

  public runAfter() {
    this.instrumentation.teardown()
  }

  public testManyElements(i: number) {
    Rx.Observable.range(0, i, Rx.Scheduler.currentThread)
      .map(x => x * 2)
      .subscribe()
  }

  public testManyFlatMaps(i: number) {
    Rx.Observable.range(0, i, Rx.Scheduler.currentThread)
      .map(i => i * 2)
      .flatMap(x => Rx.Observable.of(1, 2, 3))
      .subscribe()
  }

  @test
  public compare() {
    let self = this
    let times: { [key: string]: { plain?: [number, number], instrumented?: [number, number], factor: number } } = {}
    let functions = [
      [this.testManyElements.bind(null, 10), "testManyElements(10)"],
      [this.testManyFlatMaps.bind(null, 10), "testManyFlatMaps(10)"],
      [this.testManyElements.bind(null, 100), "testManyElements(100)"],
      [this.testManyFlatMaps.bind(null, 100), "testManyFlatMaps(100)"],
      [this.testManyElements.bind(null, 1000), "testManyElements(1000)"],
      [this.testManyFlatMaps.bind(null, 1000), "testManyFlatMaps(1000)"],
    ] as [Function, string][]
    functions.forEach(([fn, name]) => {
      let timing = times[name] = {} as { plain?: [number, number], instrumented?: [number, number], factor: number }
      let start: [number, number]

      start = time()
      fn()
      timing.plain = time(start)

      self.runBefore()
      start = time()
      fn()
      timing.instrumented = time(start)

      timing.factor = div(timing.instrumented, timing.plain)
      self.runAfter()
    })

    Object.getOwnPropertyNames(times).forEach(k =>
      console.log("Test %s took %ds %dms and %ds %dms while instrumented. Thats %dx slower.",
        k,
        times[k].plain[0], (times[k].plain[1] * 1e-6).toFixed(3),
        times[k].instrumented[0], (times[k].instrumented[1] * 1e-6).toFixed(3),
        times[k].factor.toFixed(2)
      )
    )
  }

}

function time(start?: [number, number]): [number, number] {
  if (typeof process === "undefined") {
    let result: [number, number] = [Math.floor(Date.now() / 1000), (Date.now() % 1000) * 1e6]
    if (typeof start === "undefined") {
      return result
    } else {
      let nanos = result[1] - start[1]
      return [result[0] - start[0] + nanos < 0 ? -1 : 0, nanos < 0 ? nanos + 1e9 : nanos]
    }
  } else {
    return process.hrtime(start)
  }
}

function div(a: [number, number], b: [number, number]): number {
  return a[0] + a[1] * 1e-9 / (b[0] + b[1] * 1e-9)
}
