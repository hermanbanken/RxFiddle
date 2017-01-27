import { lens as lenz } from "../src/collector/lens"
import { InstrumentationTest } from "./instrumentationTest"
import { expect } from "chai"
import { suite, test } from "mocha-typescript"
import * as Rx from "rx"
import TypedGraph from "../src/collector/typedgraph"

let rxProto: any = (<any>Rx).Observable.prototype

class TestObserver<T> implements Rx.Observer<T> {
  public nexts: T[] = []
  public error?: any = null
  public completed: boolean = false
  public events: any[] = []

  public onNext(value: T): void {
    this.nexts.push(value)
    this.events.push({ time: new Date(), value })
  }
  public onError(exception: any): void {
    this.error = exception
    this.events.push({ time: new Date(), exception })
  }
  public onCompleted(): void {
    let completed = this.completed = true
    this.events.push({ time: new Date(), completed })
  }
  public makeSafe(disposable: Rx.IDisposable): Rx.Observer<T> {
    return this
  }
  public dispose(): void {
    let disposed = true
    this.events.push({ time: new Date(), disposed })
  }
}

function jsonify(obj: any) {
  let cache = [] as any[]
  let json: string = JSON.stringify(obj, (key, value) => {
    if (typeof value === "string" && key === "stack") {
      return value.split("\\n")[0]
    }
    if (typeof value === "object" && key === "parent" && "id" in value) {
      return value.id
    }
    if (typeof value === "object" && key === "childs") {
      return "muted"
    }
    if (typeof value === "object" && value !== null) {
      if (cache.indexOf(value) !== -1) {
        // Circular reference found, discard key
        if (typeof value === "object") {
          value = Object.keys(value)
            .filter(k => value.hasOwnProperty(k))
            .map(k => value[k])
            .filter(c => typeof c !== "object")
          return "[Circular " + jsonify(value) + "]"
        }
        return "[Circular " + value.toString() + "]"
      }
      // Store value in our collection
      cache.push(value)
    }
    return value
  }, "  ")
  cache = null // Enable garbage collection
  return json
}

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

@suite
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

  // @test
  public "map"() {
    Rx.Observable.of(0, 1, 2)
      .map(i => String.fromCharCode("a".charCodeAt(0) + i))
      .subscribe()

    let lens = lenz(this.rxcollector).find("map")
    expect(lens.all()).to.have.lengthOf(1)

    let subs = lens.subscriptions().all()
    expect(subs).to.have.lengthOf(1)

    expect(lens.subscriptions().nexts().map(_ => _.value)).to.deep.eq(["a", "b", "c"])
    expect(lens.subscriptions().completes()).to.have.lengthOf(1)
  }

  // @test
  public "filter"() {
    if (this.ensureCollector(this.collector)) {
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
  }

  // @test
  public "complex"() {
    if (this.ensureCollector(this.collector)) {
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
  }

  // @test
  public "complexTiming"() {
    this.instrumentation.teardown()
    console.time("complex")
    complexObs()
    console.timeEnd("complex")
  }

  @test
  public "nested-call operators"() {
    // Rx.Observable.of(1, 2, 3)
    //   .share()
    //   .subscribe()
    // console.log("")
    // console.log("")
    // console.log("START")

    complexObs()
    // let obs = Rx.Observable.of(1, 2, 3)
    //   .doOnNext(v => { return })
    //   .flatMap(v => { console.log("Running"); return Rx.Observable.just(v).map(id => id) })
    // obs.subscribe(new TestObserver<number>())

    // console.log("END")
    // console.log(this.newcollector.observerStorage.sets)
    // console.log("")
    // console.log("")

    let fs = require("fs")

    let t2 = new TypedGraph()
    this.newcollector.messages
      .flatMap(v => v.type === "edge" ? [v.edge as { v: number, w: number, label: any }] : [])
      .forEach(e => t2.setEdge(e.v.toString(), e.w.toString(), e.label))
    // console.log("DOT messages", t2.toDot())

    // console.log("")
    // console.log("")
    // console.log("ALL MESSAGES to messages.json")
    fs.writeFileSync("messages.json", jsonify(this.newcollector.messages))
    // console.log("ALL TRACE to trace.json")
    // fs.writeFileSync("trace.json", jsonify(this.newcollector.trace))
    // console.log("ALL DATA to data.json")
    // fs.writeFileSync("data.json", jsonify(this.rxcollector.data.filter(v => !("stackframe" in v))))
    // console.log("")
    // console.log("")

    expect(this.rxcollector.lens().roots().all()).to.deep.eq([{
      arguments: [1, 2, 3],
      id: 0,
      method: "of",
      parents: [],
      stack: 2,
    }])

    let childs = this.rxcollector.lens().roots().childs()

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

  // @test
  public "higher order operators"() {

    Rx.Observable.of(1, 2, 3)
      .flatMap(i => Rx.Observable.empty())
      .subscribe()

    let lens = this.rxcollector.lens()

    expect(lens.all().all().map(_ => _.method || _)).to.deep.equal([
      "of", "flatMap", "empty",
    ])

    let flatMapSubId = lens.find("flatMap").subscriptions().all()[0].id
    expect(lens.find("empty").subscriptions().all().map(_ => _.scopeId)).to.deep.equal(
      [flatMapSubId, flatMapSubId, flatMapSubId]
    )
    expect(lens.find("flatMap").subscriptions().scoping().all()).to.have.lengthOf(3)
  }

  // @test
  public "mixed higher order operators"() {
    let inner = Rx.Observable.fromArray(["a"])
    inner.subscribe()
    Rx.Observable.of(1, 2, 3)
      .flatMap(i => inner)
      .subscribe()

    let lens = this.rxcollector.lens()
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

  // @test
  public "performance operators"() {
    Rx.Observable.of(1, 2, 3)
      .map(s => s)
      .map(o => o)
      .subscribe()
    let lens = this.rxcollector.lens()
    expect(lens.find("map").all().map(_ => _.method)).to.deep.equal(["map", "map"])

    // Map combines subsequent maps: the first operator will never receive subscribes
    lens.find("map").each().forEach((mapLens, i) => {
      expect(mapLens.subscriptions().all()).to.have.lengthOf(i === 0 ? 0 : 1)
    })

  }
}
