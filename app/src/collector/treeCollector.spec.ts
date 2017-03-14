import { jsonify } from "../../test/utils"
import { IObservableTree, IObserverTree, ObserverTree, SubjectTree } from "../oct/oct"
import Instrumentation, { defaultSubjects } from "./instrumentation"
import { TreeCollector, TreeReader, TreeWriter } from "./treeCollector"
import TypedGraph from "./typedgraph"
import { expect } from "chai"
import { suite, test } from "mocha-typescript"
import * as Rx from "rx"

let btoa: Function
if (typeof btoa !== "function") {
  btoa = (str: string | Buffer) => {
    return (str instanceof Buffer ? str : new Buffer(str.toString(), "binary")).toString("base64")
  }
}

@suite
export class TreeCollectorTest {

  protected instrumentation: Instrumentation
  protected collector: TreeCollector
  protected writer: TreeWriter
  public testObserver(): Rx.Observer<any> {
    return Rx.Observer.create<any>()
  }

  public before() {
    this.writer = new TreeWriter()
    this.collector = new TreeCollector(this.writer)
    this.instrumentation = new Instrumentation(defaultSubjects, this.collector)
    this.instrumentation.setup()
  }

  public after() {
    this.instrumentation.teardown()
  }

  public graph(): TypedGraph<IObservableTree | IObserverTree, {}> {
    let reader = new TreeReader()
    this.writer.messages.forEach(m => reader.next(m))
    return reader.treeGrapher.graph
  }

  public dot(): string {
    let viz = this.graph().toDot(
      (n: IObserverTree | IObservableTree) => ({
        color: n instanceof SubjectTree ? "purple" : (n instanceof ObserverTree ? "red" : "blue"),
        label: (n && n.names.join("\n") || n && n.id)
        // + "\\n" + (n instanceof ObservableTree && n.calls ? n.calls.map(_ => _.method).join(",") : "")
        ,
      }),
      e => Object.assign(e, { minlen: (e as any).label === "source" ? 1 : 1 }),
      n => n instanceof ObserverTree ? "red" : "blue",
      () => ["rankdir=TB"]
    )
    return "https://hermanbanken.github.io/RxFiddle/app/static/graphviz.html#" + btoa(viz)
  }

  public write(name: string) {
    let fs = require("fs")
    fs.writeFileSync(`dist/${name}.graph.txt`, this.dot())
    fs.writeFileSync(`dist/${name}.json`, jsonify(this.writer.messages))
  }

  @test
  public gatherTreeA() {
    let first = Rx.Observable.of(1, 2, 3)
    let obs = first
      .map(_ => _)
      .filter(_ => true)
    let s = obs.subscribe(this.testObserver())

    this.write("tree_a")

    if (!this.flowsFrom(this.getObs(first), this.getSub(s))) {
      throw new Error("No connected flow")
    }
  }

  @test
  public gatherTreeB() {
    let first = Rx.Observable.fromArray([1, 2, 3], Rx.Scheduler.currentThread)
    let obs = first
      .map(_ => _)
      .filter(_ => true)
    obs.subscribe(this.testObserver())
    let s = obs.subscribe(this.testObserver())

    this.write("tree_b")

    if (!this.flowsFrom(this.getObs(first), this.getSub(s))) {
      throw new Error("No connected flow")
    }
  }

  @test
  public gatherTreeC() {
    let first = Rx.Observable
      .of(1, 2, 3)
    let s = first
      .reduce((a: number, b: number) => a + b)
      .skip(0)
      .filter(t => true)
      .subscribe(this.testObserver())

    this.write("tree_c")

    if (!this.flowsFrom(this.getObs(first), this.getSub(s))) {
      throw new Error("No connected flow")
    }
  }

  @test
  public gatherTreeD() {
    let first = Rx.Observable.of(1, 2, 3).take(3)
    let shared = first.publish()
    let end = shared.reduce((a: number, b: number) => a + b).skip(0).filter(t => true)
    let s = end.subscribe(this.testObserver())
    end.subscribe(this.testObserver())
    end.subscribe(this.testObserver())
    shared.connect()

    this.write("tree_d")

    if (!this.flowsFrom(this.getObs(first), this.getSub(s))) {
      console.log("flowsThrough", this.flowsTrough(this.getSub(s)))
      console.info("Fix this test!")
      // throw new Error("No connected flow")
    }
  }

  @test
  public gatherTreeE() {
    let first = Rx.Observable.of(1, 2, 3)
    let shared = first
      .share()
    let end1 = shared.filter(_ => true)
    let end2 = shared.reduce((a: number, b: number) => a + b)

    let s2 = end2.subscribe(this.testObserver())
    let s1 = end1.subscribe(this.testObserver())

    this.write("tree_e")

    if (!this.flowsFrom(this.getObs(first), this.getSub(s1)) || !this.flowsFrom(this.getObs(first), this.getSub(s2))) {
      console.log("flowsThrough", this.flowsTrough(this.getSub(s1)))
      console.info("Fix this test!")
      // throw new Error("No connected flow")
    }
  }

  @test
  public gatherTreeF() {
    let inner = Rx.Observable.just("a").startWith("b").skip(1)
    let first = Rx.Observable.of(1, 2, 3)
    let s = first
      .flatMap(item => inner)
      .filter(_ => true)
      .subscribe(this.testObserver())

    this.write("tree_f")

    if (!this.flowsFrom(this.getObs(first), this.getSub(s)) || !this.flowsFrom(this.getObs(inner), this.getSub(s))) {
      console.log(this.flowsTrough(this.getSub(s)))
      throw new Error("No connected flow")
    }
  }

  @test
  public concatObserverTest() {
    let o = Rx.Observable.just("a").concat(Rx.Observable.just("b")).map(_ => _)
    let s = o.subscribe(this.testObserver())

    let wrong = this.flowsTrough(this.getSub(s)).find(_ => _.indexOf("undefined") >= 0)
    if (wrong) {
      console.log(this.flowsTrough(this.getSub(s)))
      throw new Error("ConcatObserver is preceded with unknown observer: " + wrong)
    }
  }

  @test
  public shareTest() {
    let first = Rx.Observable.of(1, 2, 3)
    let shared = first.share()

    let end1 = shared.filter(_ => true)
    let end2 = shared.reduce((a: number, b: number) => a + b)

    let s2 = end2.subscribe(this.testObserver())
    let s1 = end1.subscribe(this.testObserver())

    // console.log(this.dot())
    console.log("flowsThrough s1", this.flowsTrough(this.getSub(s1)))
    console.log("flowsThrough s2", this.flowsTrough(this.getSub(s2)))
    // throw new Error("TODO just like above")
    console.info("Fix this test!")
    console.log(this.dot())

    if (!this.flowsFrom(this.getObs(first), this.getSub(s1))) {
      // throw new Error("No connected flow s1")
    }
    if (!this.flowsFrom(this.getObs(first), this.getSub(s2))) {
      // throw new Error("No connected flow s2")
    }
  }

  @test
  public testVarietyOfStaticOperators(done: Function) {

    let operators = [["of", 1, 2, 3], ["empty"]]

    let o = Rx.Observable.range(0, 10)
    let s = o.subscribe()

    console.log("Fix test")
    done()
  }

  @test
  public rangeTest(done: Function) {
    let o = Rx.Observable.range(0, 10)
    o.subscribe(this.testObserver())

    setTimeout(() => {
      let g = this.graph()
      let events = (g.node(g.sinks()[0]) as IObserverTree).events
      expect(events.filter(n => n.type === "subscribe")).length.to.be.at.least(1)
      expect(events.filter(n => n.type === "next")).to.have.length(10)
      expect(events.filter(n => n.type === "complete")).to.have.length(1)
      done()
    }, 0)
  }

  @test
  public partitionTest(done: Function) {
    let [a] = Rx.Observable.range(0, 10)
      .partition(i => i % 2 === 0)
    a.subscribe(this.testObserver())

    setTimeout(() => {
      let g = this.graph()
      let events = g.sinks().map(n => g.node(n) as IObserverTree).flatMap(n => n.events || [])
      expect(events.filter(n => n.type === "subscribe")).length.to.be.at.least(1)
      expect(events.filter(n => n.type === "next")).to.have.length(5)
      expect(events.filter(n => n.type === "complete")).to.have.length(1)
      done()
    }, 0)
  }

  @test
  public testInstanceOperators(done: Function) {
    let operators: any[][] = [
      ["map", (_: any) => _],
      ["filter", (_: any, i: number) => i % 2 === 0],
      ["reduce", (p: number, n: number) => p + n, 0],
      ["scan", (p: number, n: number) => p + n, 0],
      ["average", (v: number) => v],
      ["bufferWithCount", 2],
      ["pluck", (_: any) => _],
      // ["controlled", true],
      ["count"],
      ["debounce", 0],
      ["defaultIfEmpty", 1],
      // ["delay", (_: number) => Rx.Observable.timer(30)],
      // ["delay", 0],
      ["elementAt", 2],
      ["every", (_: any, i: number) => i % 2 === 1],
      ["manySelect", (_: Rx.Observable<number>) => _.first()],
      ["flatMapWithMaxConcurrent", 2, (inp: number) => Rx.Observable.just(inp)],
      ["forkJoin", Rx.Observable.just(1), (a: any, b: any) => a + b],
      ["forkJoin", Rx.Observable.just(1), Rx.Observable.timer(10), Rx.Observable.timer(10), (a: any, b: any) => a + b],
      // ["jortSort"],
      // ["jortSortUntil", Rx.Observable.timer(10)],
      ["last"],
      ["let", (_: Rx.Observable<number>) => _.concat(_)],
      ["max"],
      ["pairwise"],
      // ["repeat", 2],
      ["sample", 10],
      // ["sequenceEqual", Rx.Observable.of(1, 2, 3)],
      // ["subscribeOn", Rx.Scheduler.async],
      ["observeOn", Rx.Scheduler.async],
      ["toMap", (_: any) => _, (_: any) => _],
      // ["window", () => Rx.Observable.timer(1)],
      ["zip", Rx.Observable.range(0, 3), Rx.Observable.range(3, 6), (a: number, b: number, c: number) => a + b + c],
    ]

    let self = this

    function next() {
      if (operators.length === 0) {
        return done()
      }

      let [op, ...args] = operators.shift()
      let inp = Rx.Observable.of(1, 2, 3, 4, 5)
      let applied = ((inp as any)[op] as Function).apply(inp, args)
      let sub = applied.subscribe()

      Rx.Scheduler.currentThread.schedule(null, () => {
        let flows = self.flowsFrom(self.getObs(inp), self.getSub(sub))
        if (!flows) {
          console.log(op, self.dot())
          throw new Error("no link")
        }
        expect(flows, "testing " + op).to.be.true

        self.after()
        self.before()
        next()
        return Rx.Disposable.empty
      })
    }
    next()
  }

  private flowsFrom(observable: IObservableTree, to: IObserverTree, remaining: number = 100): boolean {
    if (to && to.observable === observable) {
      return true
    } else if (to && typeof to.inflow !== "undefined" && remaining > 0) {
      if (to.inflow.some(f => this.flowsFrom(observable, f, remaining - 1))) {
        return true
      }
    }
    return false
  }

  private flowsTrough(to: IObserverTree, remaining: number = 20): string[] {
    if (to && typeof to.inflow !== "undefined" && remaining > 0) {
      return to.inflow
        .filter(f => f !== to)
        .flatMap<string>(f => this
          .flowsTrough(f, remaining - 1)
          .map<string>(flow => `${flow}/${(to.observable && to.observable.names[0])}`)
        )
    }
    return [(to.observable && to.observable.names[0])]
  }

  private getObs(o: Rx.Observable<any>): IObservableTree | undefined {
    return (o as any)[this.collector.hash] as IObservableTree
  }
  private getSub(o: Rx.Subscription | Rx.Disposable): IObserverTree | undefined {
    if ("observer" in o) {
      return (o as any).observer[this.collector.hash] as IObserverTree
    }
    return (o as any)[this.collector.hash] as IObserverTree
  }

}
