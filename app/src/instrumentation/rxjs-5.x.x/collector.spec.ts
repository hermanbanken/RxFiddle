import { jsonify } from "../../../test/utils"
import { TreeReader, TreeWriter } from "../../collector/treeReader"
import TypedGraph from "../../collector/typedgraph"
import { IObservableTree, IObserverTree, ObserverTree, SubjectTree } from "../../oct/oct"
import { TreeCollector } from "./collector"
import Instrumentation, { isInstrumented } from "./instrumentation"
import { expect } from "chai"
import { suite, test } from "mocha-typescript"
import * as Rx from "rxjs/Rx"

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
    this.writer = new TreeWriter()
    this.collector = new TreeCollector(this.writer)
    this.instrumentation = new Instrumentation(this.collector)
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
    return "https://rxfiddle.net/graphviz.html#" + btoa(viz)
  }

  public write(name: string) {
    let fs = require("fs")
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
  public someTest() {
    let input = Rx.Observable.of(1, 2, 3)
    let obs = input.map(_ => _)
      .filter(_ => true)
    let sub = obs.subscribe()

    this.write("tree5_a")

    if (!this.flowsFrom(this.getObs(input), this.getSub(sub))) {
      console.log("flowsThrough sub", this.flowsTrough(this.getSub(sub)))
      throw new Error("No connected sub")
    }
  }

  @test
  public someConcatTest() {
    let a = Rx.Observable.of(1, 2, 3)
    let b = Rx.Observable.of(4, 5, 6)
    let obs = Rx.Observable
      .concat(a, b)
      .map(_ => _)
    let sub = obs.subscribe()

    this.write("tree5_b")

    if (!this.flowsFrom(this.getObs(a), this.getSub(sub)) || !this.flowsFrom(this.getObs(b), this.getSub(sub))) {
      console.log("flowsThrough sub", this.flowsTrough(this.getSub(sub)))
      throw new Error("No connected sub")
    }
  }

  @test
  public someConcatTest2() {
    let obs1 = Rx.Observable.of(1, 2, 3)
    let obs2 = Rx.Observable.of(4, 5, 6)

    obs1.concat(obs2)
      .map(x => x * 2)
      .filter(x => x > 4)
      .do(x => console.log(x))
      .subscribe()

    this.write("tree5_c")
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

  private getSub(o: Rx.Subscription): IObserverTree | undefined {
    if ("observer" in o) {
      return (o as any).observer[this.collector.hash] as IObserverTree
    }
    return (o as any)[this.collector.hash] as IObserverTree
  }

}
