import { lens as lenz } from "../src/collector/lens"
import { InstrumentationTest } from "./instrumentationTest"
import { expect } from "chai"
import { suite, test } from "mocha-typescript"
import * as Rx from "rx"

let rxProto: any = (<any>Rx).Observable.prototype

function complexObs() {
  let A = Rx.Observable.of(1, 2, 3)
    .map(i => "hello " + i)
    .filter(_ => true)
    .map(_ => _)
    .skip(1)
    .share()

  A.flatMapLatest(s => Rx.Observable.of("postfix").startWith(s))
    .groupBy(s => s[s.length - 1])
    .map(o => o.startWith("group of " + o.key))
    .mergeAll()
    .subscribe()
}

// @suite
export class OperatorTest extends InstrumentationTest {

  // @test
  public "test coverage"() {
    let tested = [
      "map",
    ]
    let untested = Object.keys(rxProto).filter(method => tested.indexOf(method) < 0)
    if (untested.length !== 0) {
      throw new Error("Untested methods: " + untested.length)
      // throw new Error("Untested methods: " + untested.join(", "))
    }
  }

  @test
  public "map"() {
    Rx.Observable.of(0, 1, 2)
      .map(i => String.fromCharCode("a".charCodeAt(0) + i))
      .subscribe()

    let lens = lenz(this.collector).find("map")
    expect(lens.all()).to.have.lengthOf(1)

    let subs = lens.subscriptions().all()
    expect(subs).to.have.lengthOf(1)

    expect(lens.subscriptions().nexts().map(_ => _.value)).to.deep.eq(["a", "b", "c"])
    expect(lens.subscriptions().completes()).to.have.lengthOf(1)
  }

  @test
  public "filter"() {
    Rx.Observable.of(1, 2, 3)
      .filter(i => i < 2)
      .subscribe()

    let lens = lenz(this.collector).find("filter")
    expect(lens.all()).to.have.lengthOf(1)

    let subs = lens.subscriptions().all()
    expect(subs).to.have.lengthOf(1)

    expect(lens.subscriptions().nexts().map(_ => _.value)).to.deep.eq([1])
    expect(lens.subscriptions().completes()).to.have.lengthOf(1)
  }

  @test
  public "complex"() {
    console.time("complex instrumented")
    complexObs()
    console.timeEnd("complex instrumented")

    let lens = lenz(this.collector).find("mergeAll")
    expect(lens.all()).to.have.lengthOf(1)

    let subs = lens.subscriptions().all()
    expect(subs).to.have.lengthOf(1)

    expect(lens.subscriptions().nexts().map(_ => _.value)).to.deep.eq([
      "group of 2",
      "hello 2",
      "group of x",
      "postfix",
      "group of 3",
      "hello 3",
      "postfix",
    ])
    expect(lens.subscriptions().completes()).to.have.lengthOf(1)
  }

  @test
  public "complexTiming"() {
    this.instrumentation.teardown()
    console.time("complex")
    complexObs()
    console.timeEnd("complex")
  }

  @test
  public "nested-call operators"() {
    Rx.Observable.of(1, 2, 3)
      .share()
      .subscribe()

    expect(this.collector.lens().roots().all()).to.deep.eq([{
      arguments: [1, 2, 3],
      id: 0,
      method: "of",
      parents: [],
      stack: undefined,
    }])

    let childs = this.collector.lens().roots().childs()

    expect(childs.all()).to.deep.eq([{
      arguments: [],
      id: 1,
      method: "share",
      parents: [0],
      stack: undefined,
    }])

    expect(childs.internals().all())
      .to.have.length.greaterThan(0)
  }

  @test
  public "higher order operators"() {
    Rx.Observable.of(1, 2, 3)
      .flatMap(i => Rx.Observable.empty())
      .subscribe()

    let lens = this.collector.lens()

    expect(lens.all().all().map(_ => _.method || _)).to.deep.equal([
      "of", "flatMap", "empty",
    ])

    let flatMapSubId = lens.find("flatMap").subscriptions().all()[0].id
    expect(lens.find("empty").subscriptions().all().map(_ => _.scopeId)).to.deep.equal(
      [flatMapSubId, flatMapSubId, flatMapSubId]
    )
    expect(lens.find("flatMap").subscriptions().scoping().all()).to.have.lengthOf(3)

  }

  @test
  public "mixed higher order operators"() {
    let inner = Rx.Observable.fromArray(["a"])
    inner.subscribe()
    Rx.Observable.of(1, 2, 3)
      .flatMap(i => inner)
      .subscribe()

    let lens = this.collector.lens()
    let roots = lens.roots()
    let childs = roots.childs()

    expect(roots.all().map(_ => _.method || _)).to.deep.equal(["fromArray", "of"])
    expect(childs.all().map(_ => _.method || _)).to.deep.equal(["flatMap"])

    let flatMapSubId = lens.find("flatMap").subscriptions().all()[0].id
    expect(lens.find("fromArray").subscriptions().all().map(_ => _.scopeId)).to.deep.equal(
      [undefined, flatMapSubId, flatMapSubId, flatMapSubId]
    )
    expect(lens.find("flatMap").subscriptions().scoping().all()).to.have.lengthOf(3)
  }

  @test
  public "performance operators"() {
    Rx.Observable.of(1, 2, 3)
      .map(s => s)
      .map(o => o)
      .subscribe()
    let lens = this.collector.lens()
    expect(lens.find("map").all().map(_ => _.method)).to.deep.equal(["map", "map"])

    // Map combines subsequent maps: the first operator will never receive subscribes
    lens.find("map").each().forEach((mapLens, i) => {
      expect(mapLens.subscriptions().all()).to.have.lengthOf(i === 0 ? 0 : 1)
    })
  }
}
