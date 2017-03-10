import Instrumentation, { defaultSubjects } from "../src/collector/instrumentation"
import { TreeCollector, TreeReader, TreeWriter } from "../src/collector/treeCollector"
import { IObservableTree, IObserverTree, ObserverTree, SubjectTree } from "../src/oct/oct"
import { jsonify } from "./utils"
import { suite, test } from "mocha-typescript"
import * as Rx from "rx"

@suite
export class TreeCollectorTest {

  protected instrumentation: Instrumentation
  protected collector: TreeCollector
  protected writer: TreeWriter

  public before() {
    this.writer = new TreeWriter()
    this.collector = new TreeCollector(this.writer)
    this.instrumentation = new Instrumentation(defaultSubjects, this.collector)
    this.instrumentation.setup()
  }

  public after() {
    this.instrumentation.teardown()
  }

  public write(name: string) {
    let fs = require("fs")
    let reader = new TreeReader()
    this.writer.messages.forEach(m => reader.next(m))
    fs.writeFileSync(`dist/${name}.graph.txt`, reader.treeGrapher.graph.toDot(
      n => ({
        color: n instanceof SubjectTree ? "purple" : (n instanceof ObserverTree ? "red" : "blue"),
        label: n && n.names[0] || n && n.id,
      }),
      e => Object.assign(e, { minlen: (e as any).label === "source" ? 1 : 1 }),
      n => n instanceof ObserverTree ? "red" : "blue",
      () => ["rankdir=TB"]
    ))
    fs.writeFileSync(`dist/${name}.json`, jsonify(this.writer.messages))
  }

  @test
  public gatherTreeA() {
    let first = Rx.Observable.of(1, 2, 3)
    let obs = first
      .map(_ => _)
      .filter(_ => true)
    let s = obs.subscribe()

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
    obs.subscribe()
    let s = obs.subscribe()

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
      .subscribe()

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
    let s = end.subscribe()
    end.subscribe()
    end.subscribe()
    shared.connect()

    this.write("tree_d")

    console.log("flowsThrough", this.flowsTrough(this.getSub(s)))
    if (!this.flowsFrom(this.getObs(first), this.getSub(s))) {
      throw new Error("No connected flow")
    }
  }

  @test
  public gatherTreeE() {
    let first = Rx.Observable.of(1, 2, 3)
    let shared = first
      .share()
    let end1 = shared.filter(_ => true)
    let end2 = shared.reduce((a: number, b: number) => a + b)

    let s2 = end2.subscribe()
    let s1 = end1.subscribe()

    this.write("tree_e")

    console.log("flowsThrough", this.flowsTrough(this.getSub(s1)))
    if (!this.flowsFrom(this.getObs(first), this.getSub(s1)) || !this.flowsFrom(this.getObs(first), this.getSub(s2))) {
      throw new Error("No connected flow")
    }
  }

  @test
  public gatherTreeF() {
    let inner = Rx.Observable.just("a").startWith("b").skip(1)
    let first = Rx.Observable.of(1, 2, 3)
    let s = first
      .flatMap(item => inner)
      .filter(_ => true)
      .subscribe()

    this.write("tree_f")

    console.log(this.flowsTrough(this.getSub(s)))
    if (!this.flowsFrom(this.getObs(first), this.getSub(s)) || !this.flowsFrom(this.getObs(inner), this.getSub(s))) {
      throw new Error("No connected flow")
    }
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
          .map<string>(flow => `${flow}/${to.observable && to.observable.names[0]}`)
        )
    }
    return [to.observable.names[0]]
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
