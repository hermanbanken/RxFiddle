import { toDot, rankLongestPathGraph, groupByUniq } from "../src/collector/graphutils"
import { ordering } from "../src/layout/ordering"
import { normalize } from "../src/layout/normalize"
import { priorityLayout } from "../src/layout/priority"
import { InstrumentationTest } from "./instrumentationTest"
import { expect } from "chai"
import { suite, test } from "mocha-typescript"
import * as Rx from "rx"

@suite
export class IntegrationTest extends InstrumentationTest {

  @test
  public "subscription sources"() {
    let left = Rx.Observable
      .zip<number, number, { a: number, b: number }>([
        Rx.Observable.of(1).map(a => a),
        Rx.Observable.of(2).filter(a => true).map(a => a),
      ], (a, b) => ({ a, b }))
      .filter(a => true)

    let right: Rx.Observable<number> = Rx.Observable
      .of("a")
      .map(a => 1)
      .scan((a: number, n: number) => a + n, 0)

    let merged = Rx.Observable.merge(...[left, left, right, right]
      .map((obs: Rx.Observable<number | { a: number, b: number }>) => obs
        .map(a => a)
        .filter((a: any) => true)
        .map(a => a)))

    merged.subscribe()

    // let grapher = new Grapher(this.rxcollector)
    // grapher.process()

    // let leveledDot = toDot(
    //   grapher.leveledGraph.filterNodes((n, l) => l.level !== "code"),
    //   n => {
    //     let v = grapher.leveledGraph.node((n as any))
    //     return ({ label: v.level === "observable" ? (v.payload as any).method : v.id })
    //   },
    //   ({ v, w }) => {
    //     let e = grapher.leveledGraph.edge(v, w) as LayerCrossingEdge
    //     if (typeof e !== "undefined" && typeof e.upper !== "undefined" && e.upper !== e.lower) {
    //       return { constraint: false, type: "s" }
    //     } else {
    //       return { type: "s" }
    //     }
    //   }
    // )
    // console.log(leveledDot)

    // console.log(layout(grapher.leveledGraph))

    // TODO:
    // get <rows> containing node ids
    // ordering(<rows>)
    // replace single obs with their subscriptions
    // do local-orderning per set of subs, traversing each tree of the observable
    // output and visualize
    // ...
    // profit

    // OLD, remove
    // let lens = this.collector.lens()
    // let a = lens.find("of").subscriptions().all()[0]
    // let b = lens.find("map").subscriptions().all()[0]
    // let c = lens.find("filter").subscriptions().all()[0]
    // expect(a.sinks).to.deep.equal([b.id], "no sink for of -> map")
    // expect(b.sinks).to.deep.equal([c.id], "no sink for map -> filter")
  }
}
