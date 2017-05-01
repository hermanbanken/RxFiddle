// tslint:disable:max-line-length
import "../../../src/utils"
import { jsonify } from "../../../test/utils"
import TreeReader from "../../collector/treeReader"
import TreeWriter from "../../collector/treeWriter"
import TypedGraph from "../../collector/typedgraph"
import { IObservableTree, IObserverTree, ObserverTree, SubjectTree } from "../../oct/oct"
import { TreeCollector } from "./collector"
import Instrumentation, { isInstrumented } from "./instrumentation"
import { expect } from "chai"
import { only, suite, test } from "mocha-typescript"
import * as Rx from "rxjs/Rx"
// import { HotObservable as hot } from "rxjs/helpers/marbleTesting"

let btoa: Function
if (typeof btoa !== "function") {
  btoa = (str: string | Buffer) => {
    return (str instanceof Buffer ? str : new Buffer(str.toString(), "binary")).toString("base64")
  }
}

@suite
export class TreeCollectorRx5Test {

  protected instrumentation: Instrumentation
  protected collector: TreeCollector
  protected writer: TreeWriter

  public before() {
    console.log("Arguments", arguments)
    this.writer = new TreeWriter()
    this.collector = new TreeCollector(this.writer)
    this.instrumentation = new Instrumentation(this.collector)
    this.instrumentation.setup()
  }

  public after() {
    console.log(this.trees())

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
        + (n instanceof ObserverTree ? `(${n.events.length})` : "")
        // + "\\n" + (n instanceof ObservableTree && n.calls ? n.calls.map(_ => _.method).join(",") : "")
        ,
      }),
      e => Object.assign(e, { minlen: (e as any).label === "source" ? 1 : 1 }),
      n => n instanceof ObserverTree ? "red" : "blue",
      () => ["rankdir=TB"]
    )
    return "https://rxfiddle.net/graphviz.html#" + btoa(viz)
  }

  public write(name: string) {
    let fs = require("fs")
    fs.writeFileSync(`dist/${name}.stacks.txt`, jsonify(this.instrumentation.callstacks))
    fs.writeFileSync(`dist/${name}.graph.txt`, this.dot())
    fs.writeFileSync(`dist/${name}.json`, jsonify(this.writer.messages))
  }

  @test
  public ensureInstrumented() {
    expect(isInstrumented(Rx.Observable.of(1).map)).to.be.greaterThan(0) // Instance methods
    expect(isInstrumented(Rx.Observable.of)).to.be.greaterThan(0) // Static methods
    // Prototypes
    expect(Rx.Observable.prototype).to.have.property("__dynamicallyInstrumented", true)
    expect(Rx.Subject.prototype).to.have.property("__dynamicallyInstrumented", true)
  }

  @test
  public ensureTeardownWorks() {
    this.instrumentation.teardown()
    expect(isInstrumented(Rx.Observable.of(1).map)).to.be.eq(0) // Instance methods
    expect(isInstrumented(Rx.Observable.of)).to.be.eq(0) // Static methods
    // Prototypes
    expect(Rx.Observable.prototype).to.not.haveOwnProperty("__dynamicallyInstrumented")
    expect(Rx.Subject.prototype).to.not.haveOwnProperty("__dynamicallyInstrumented")
  }

  @test
  public simpleChainTest() {
    let input = Rx.Observable.of(1)
    let obs = input.map(_ => _)
    let sub = obs.subscribe()

    this.write("tree5_a")

    if (!this.flowsFrom(this.getObs(input), this.getSub(sub))) {
      throw new Error("Simple observable chain is not connected in OCT")
    }
  }

  // @only
  @test
  public simpleHigherOrderConcatTest() {
    let a = Rx.Observable.of(1, 2, 3)
    let b = Rx.Observable.of(4, 5, 6)
    let obs = Rx.Observable
      .concat(a, b)
      .map(_ => _)
    let sub = obs.subscribe()

    this.write("tree5_b")

    if (!this.flowsFrom(this.getObs(a), this.getSub(sub))) {
      throw new Error("Merged observable a is not connected in OCT")
    }
    if (!this.flowsFrom(this.getObs(b), this.getSub(sub))) {
      throw new Error("Merged observable b is not connected in OCT")
    }
  }

  @test
  public testSubjects() {
    let a = new Rx.Subject<{ k: number }>()
    let b = a.map(_ => _.k)
    let c = b.map(x => x * 2)

    c.subscribe(ic => console.log(ic))
    b.subscribe(ib => console.log(ib))
    a.subscribe(ia => console.log(ia))

    Rx.Observable.of(1, 2, 3).subscribe(() =>
      (b as Rx.Subject<any>).next({ k: 1 })
    )
  }

  @test
  // @only
  public simpleDetachedChainTest() {
    let a = Rx.Observable.of("A")
    let b = a.publish(o => o.map(x => x + x).filter(x => true))
    let sub = b.subscribe()

    this.write("tree5_simple_publish")
    if (!this.flowsFrom(this.getObs(a), this.getSub(sub))) {
      throw new Error("Root observable is not connected in OCT, using publish")
    }
  }

  @test
  // @only
  public complexDetachedChainTest() {
    let a = Rx.Observable.of(1, 2, 3).map(x => x)
    let b = a.publish(o => o
      .filter(x => true)
      .scan((p, n) => p + n, 10)
      .takeUntil(o
        .skip(1)
        .delay(10)
        .filter(x => true)
      )
      .take(1))
    let sub = b.subscribe()

    expect(this.getObs(a).sources).to.not.contain(this.getObs(a))

    this.write("tree5_publish")
    if (!this.flowsFrom(this.getObs(a), this.getSub(sub))) {
      throw new Error("Root observable is not connected in OCT, using publish")
    }
  }

  /**
   * Test regression: invalid source loop at refcount-input
   * http://localhost:8085/graphviz.html#ZGlncmFwaCBnCnsKcmFua2Rpcj1UQgpzdWJncmFwaCBjbHVzdGVyMCB7IDEgMiAzIDQgNSA2IDcgOCA5IDEwIDExIDEyIH07CjEgW2NvbG9yPSJibHVlIiwgbGFiZWw9IlNjYWxhck9ic2VydmFibGUiXTsKMiBbY29sb3I9ImJsdWUiLCBsYWJlbD0iT2JzZXJ2YWJsZSJdOwozIFtjb2xvcj0icmVkIiwgbGFiZWw9IlJlZkNvdW50U3Vic2NyaWJlcig0KSJdOwo0IFtjb2xvcj0icmVkIiwgbGFiZWw9IlN1YnNjcmliZXIoNCkiXTsKNSBbY29sb3I9InJlZCIsIGxhYmVsPSJTYWZlU3Vic2NyaWJlcigxKSJdOwo2IFtjb2xvcj0icHVycGxlIiwgbGFiZWw9IlN1YmplY3QiXTsKNyBbY29sb3I9InJlZCIsIGxhYmVsPSJDb25uZWN0YWJsZVN1YnNjcmliZXIoMykiXTsKOCBbY29sb3I9ImJsdWUiLCBsYWJlbD0iT2JzZXJ2YWJsZSJdOwo5IFtjb2xvcj0icmVkIiwgbGFiZWw9Ik1hcFN1YnNjcmliZXIoMykiXTsKMTAgW2NvbG9yPSJyZWQiLCBsYWJlbD0iU3Vic2NyaWJlcigzKSJdOwoxMSBbY29sb3I9InJlZCIsIGxhYmVsPSJTYWZlU3Vic2NyaWJlcigxKSJdOwoxMiBbY29sb3I9InJlZCIsIGxhYmVsPSJSZWZDb3VudFN1YnNjcmliZXIoMykiXTsKMSAtPiAxIFt0eXBlPSJhZGRTb3VyY2UiLCBsYWJlbD0ic291cmNlIiwgbWlubGVuPSIxIl07CjEgLT4gMiBbdHlwZT0iYWRkU291cmNlIiwgbGFiZWw9InNvdXJjZSIsIG1pbmxlbj0iMSJdOwo0IC0+IDUgW3R5cGU9ImFkZE9ic2VydmVyRGVzdGluYXRpb24iLCBsYWJlbD0iZGVzdGluYXRpb24iLCBtaW5sZW49IjEiXTsKMyAtPiA0IFt0eXBlPSJhZGRPYnNlcnZlckRlc3RpbmF0aW9uIiwgbGFiZWw9ImRlc3RpbmF0aW9uIiwgbWlubGVuPSIxIl07CjYgLT4gMyBbdHlwZT0ic2V0T2JzZXJ2ZXJTb3VyY2UiLCBsYWJlbD0ib2JzZXJ2YWJsZSIsIG1pbmxlbj0iMSJdOwo3IC0+IDYgW3R5cGU9ImFkZE9ic2VydmVyRGVzdGluYXRpb24iLCBsYWJlbD0iZGVzdGluYXRpb24iLCBtaW5sZW49IjEiXTsKMSAtPiA3IFt0eXBlPSJzZXRPYnNlcnZlclNvdXJjZSIsIGxhYmVsPSJvYnNlcnZhYmxlIiwgbWlubGVuPSIxIl07CjIgLT4gNCBbdHlwZT0ic2V0T2JzZXJ2ZXJTb3VyY2UiLCBsYWJlbD0ib2JzZXJ2YWJsZSIsIG1pbmxlbj0iMSJdOwoyIC0+IDggW3R5cGU9ImFkZFNvdXJjZSIsIGxhYmVsPSJzb3VyY2UiLCBtaW5sZW49IjEiXTsKMTAgLT4gMTEgW3R5cGU9ImFkZE9ic2VydmVyRGVzdGluYXRpb24iLCBsYWJlbD0iZGVzdGluYXRpb24iLCBtaW5sZW49IjEiXTsKOSAtPiAxMCBbdHlwZT0iYWRkT2JzZXJ2ZXJEZXN0aW5hdGlvbiIsIGxhYmVsPSJkZXN0aW5hdGlvbiIsIG1pbmxlbj0iMSJdOwoxMiAtPiA5IFt0eXBlPSJhZGRPYnNlcnZlckRlc3RpbmF0aW9uIiwgbGFiZWw9ImRlc3RpbmF0aW9uIiwgbWlubGVuPSIxIl07CjYgLT4gMTIgW3R5cGU9InNldE9ic2VydmVyU291cmNlIiwgbGFiZWw9Im9ic2VydmFibGUiLCBtaW5sZW49IjEiXTsKMiAtPiA5IFt0eXBlPSJzZXRPYnNlcnZlclNvdXJjZSIsIGxhYmVsPSJvYnNlcnZhYmxlIiwgbWlubGVuPSIxIl07CjggLT4gMTAgW3R5cGU9InNldE9ic2VydmVyU291cmNlIiwgbGFiZWw9Im9ic2VydmFibGUiLCBtaW5sZW49IjEiXTsKfQ==
   */
  @test
  // @only
  public refcountTest() {
    let a = Rx.Observable.of(1, 2, 3)
    let b = a.publish().refCount()
    b.map(x => x * 2).subscribe()
    let sub = b.subscribe()

    expect(this.getObs(a).sources, "expecting sources to not be circular").to.not.contain(this.getObs(a))

    this.write("tree5_refcount")
    if (!this.flowsFrom(this.getObs(a), this.getSub(sub))) {
      throw new Error("Root observable is not connected in OCT, using publish")
    }
  }

  @test
  public simplePublishConnect() {
    let a = Rx.Observable.of("A")
    let b = a.publish()
    b.subscribe()
    b.map(x => x).subscribe()
    b.connect()
    this.write("tree5_connect")
  }

  // @only
  @test
  public subjectAsObservable() {
    let s = new Rx.Subject<number>()
    s.map(x => x * 2)
    this.write("tree5_subjectAsObservable")
  }

  // @only
  @test
  public subjectAsSubcriber() {
    let s = new Rx.Subject<number>()
    s.map(x => x * 2)
      .subscribe((n) => { /* noop */ }, (e) => { /* noop */ }, () => { /* noop */ })
    s.next(1)
    s.next(2)
    console.log(
      (s as any)[this.collector.subSymbol],
      (s as any)[this.collector.symbol]
    )
    this.write("tree5_subjectAsSubscriber")
  }

  // @only
  @test
  public bmi() {
    let results = [] as number[]
    let weight = Rx.Observable.of(70, 72, 76, 79, 75)
    let height = Rx.Observable.of(1.76, 1.77, 1.78)
    let bmi = weight.combineLatest(height, (w, h) => w / (h * h))
    let sub = bmi.subscribe(x => results.push(x) && false || console.log("BMI is " + x))

    expect(results).to.have.lengthOf(3)
    expect(this.getSub(sub).events).to.have.length.greaterThan(0)
    expect(this.getSub(sub).observable).not.to.be.undefined
    this.write("tree5_bmi")
  }

  @test
  public someRxTest() {
    let s = new Rx.TestScheduler(() => void 0)

    let e1 = s.createHotObservable<number>("--a--^--b--c--|", { a: 1, b: 2, c: 3 })
    let e1subs = "^        !"
    let e2 = s.createHotObservable<number>("---e-^---f--g--|", { e: 5, f: 6, g: 7 })
    let e2subs = "^         !"
    let expected = "----x-yz--|"
    let result = Rx.Observable.combineLatest(e1, e2, (x, y) => x + y)
    s.expectObservable(result).toBe(expected, { x: "bf", y: "cf", z: "cg" })
    s.expectSubscriptions(e1.subscriptions).toBe(e1subs)
    s.expectSubscriptions(e2.subscriptions).toBe(e2subs)

    let obs1 = Rx.Observable.of(1, 2, 3)
    let obs2 = Rx.Observable.of(4, 5, 6)

    obs1.concat(obs2)
      .map(x => x * 2)
      .filter(x => x > 4)
      .do(x => console.log(x))
      .subscribe()

    this.write("tree5_c")
  }


  private trees() {
    let removed = 0
    let stree = this.collector.stree.slice(0)
    let otree = this.collector.otree.slice(0)
    // Prune non-loose nodes
    do {
      removed = 0
      function prune(item: IObserverTree) {
        removed += deleteItem(stree, item.sink) ? 1 : 0
        if (item.sink) { prune(item.sink) }
      }
      for (let item of stree) {
        prune(item)
      }
    } while (removed > 0)
    do {
      removed = 0
      function prune(item: IObservableTree) {
        if (item.sources) {
          removed += item.sources.filter(s => {
            deleteItem(otree, s)
            if (s !== item) {
              prune(s)
            }
          }).length
        }
      }
      for (let item of otree) {
        prune(item)
      }
    } while (removed > 0)
    return { stree, otree }
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
    return (o as any)[this.collector.symbol] as IObservableTree
  }

  private getSub(o: Rx.Subscription): IObserverTree | undefined {
    if ("observer" in o) {
      return (o as any).observer[this.collector.symbol] as IObserverTree
    }
    return (o as any)[this.collector.symbol] as IObserverTree
  }

}

function deleteAt<T>(list: T[], index: number): boolean {
  if (index >= 0) {
    list.splice(index, 1)
    return true
  }
  return false
}

function deleteItem<T>(list: T[], item: T): boolean {
  return deleteAt(list, list.indexOf(item))
}
