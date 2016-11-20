import { InstrumentationTest } from "./instrumentationTest"
import { expect } from "chai"
import { suite, test } from "mocha-typescript"
import * as Rx from "rx"

@suite
export class SubscriptionTest extends InstrumentationTest {

  // @test
  public "subscription sources"() {
    Rx.Observable.of(1, 2, 3)
      .map(s => s)
      .filter(o => true)
      .subscribe()
    let lens = this.collector.lens()

    let a = lens.find("of").subscriptions().all()[0]
    let b = lens.find("map").subscriptions().all()[0]
    let c = lens.find("filter").subscriptions().all()[0]

    expect(a.sinks).to.deep.equal([b.id], "no sink for of -> map")
    expect(b.sinks).to.deep.equal([c.id], "no sink for map -> filter")
  }

  @test
  public "subscription sources groupBy"() {
    Rx.Observable.of(1, 2, 3)
      .map(s => s)
      .groupBy(v => v)
      .mergeAll()
      .subscribe()
    let lens = this.collector.lens()

    let a = lens.find("of").subscriptions().all()[0]
    let b = lens.find("map").subscriptions().all()[0]
    let c = lens.find("groupBy").subscriptions().all()[0]
    let d = lens.find("mergeAll").subscriptions().all()[0]

    expect(a.sinks).to.deep.equal([b.id], "no sink for of -> map")
    expect(b.sinks).to.deep.equal([c.id], "no sink for map -> groupBy")
    expect(c.sinks).to.deep.equal([d.id], "no sink for groupBy -> mergeAll")
  }
}
