import "../../../src/utils"
import { jsonify } from "../../../test/utils"
import { ICallRecord, ICallStart } from "../../collector/callrecord"
import { TreeReader, TreeWriter } from "../../collector/treeReader"
import TypedGraph from "../../collector/typedgraph"
import { IObservableTree, IObserverTree, ObserverTree, SubjectTree } from "../../oct/oct"
import { TreeCollector } from "./collector"
import Instrumentation, { isInstrumented } from "./instrumentation"
import { expect } from "chai"
import { suite, test, only } from "mocha-typescript"
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
    let b = a.publish(o => o.map(x => x + x))
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

    this.write("tree5_publish")
    if (!this.flowsFrom(this.getObs(a), this.getSub(sub))) {
      throw new Error("Root observable is not connected in OCT, using publish")
    }
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

  // @test
  // public someRxTest() {
  //   var e1 = hot('--a--^--b--c--|', { a: 'a', b: 'b', c: 'c' });
  //   var e1subs = '^        !';
  //   var e2 = hot('---e-^---f--g--|', { e: 'e', f: 'f', g: 'g' });
  //   var e2subs = '^         !';
  //   var expected = '----x-yz--|';
  //   var result = Observable.combineLatest(e1, e2, function (x, y) { return x + y; });
  //   expectObservable(result).toBe(expected, { x: 'bf', y: 'cf', z: 'cg' });
  //   expectSubscriptions(e1.subscriptions).toBe(e1subs);
  //   expectSubscriptions(e2.subscriptions).toBe(e2subs);
  //   let obs1 = Rx.Observable.of(1, 2, 3)
  //   let obs2 = Rx.Observable.of(4, 5, 6)

  //   obs1.concat(obs2)
  //     .map(x => x * 2)
  //     .filter(x => x > 4)
  //     .do(x => console.log(x))
  //     .subscribe()

  //   this.write("tree5_c")
  // }


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
            prune(s)
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
