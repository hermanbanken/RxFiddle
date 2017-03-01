import Instrumentation, { defaultSubjects } from "../src/collector/instrumentation"
import { IObservableTree, IObserverTree, ObserverTree, SubjectTree } from "../src/oct/oct"
import { TreeCollector } from "../src/collector/collector"
import { jsonify } from "./utils"
import { suite, test } from "mocha-typescript"
import * as Rx from "rx"

@suite
export class TreeCollectorTest {

  protected instrumentation: Instrumentation
  protected collector: TreeCollector

  public before() {
    this.collector = new TreeCollector()
    this.instrumentation = new Instrumentation(defaultSubjects, this.collector)
    this.instrumentation.setup()
  }

  public after() {
    this.instrumentation.teardown()
  }

	private flowsFrom(observable: IObservableTree, to: IObserverTree) {
		if(to && to.observable === observable) {
			return true
		} else if(to && typeof to.inflow !== "undefined") {
			// if(to.inflow.some(f => this.flowsFrom(observable, f))) {
			// 	return true
			// }
		}
		return false
	}

	private getObs(o: Rx.Observable<any>): IObservableTree | undefined {
		return (o as any)[this.collector.hash] as IObservableTree
	}
	private getSub(o: Rx.Subscription | Rx.Disposable): IObserverTree | undefined {
		return (o as any)[this.collector.hash] as IObserverTree
	}

	public write(name: string) {
		let fs = require("fs")
		fs.writeFileSync(`static/${name}.graph.txt`, this.collector.graph.toDot(
			n => ({ label: n && n.name || n && n.id, color: n instanceof SubjectTree ? "purple" : (n instanceof ObserverTree ? "red" : "blue") }), 
			e => Object.assign(e, { minlen: (e as any).label === "source" ? 2 : 1 }), 
			n => n instanceof ObserverTree ? "red" : "blue", 
			() => ["rankdir=TB"]
			))
    fs.writeFileSync(`static/${name}.json`, jsonify([]))
	}

	@test
	public gatherTreeA() {
		let first = Rx.Observable.of(1, 2, 3)
    let obs = first
      .map(_ => _)
      .filter(_ => true)
		let s = obs.subscribe()

		this.write("tree_a")

		if(!this.flowsFrom(this.getObs(first), this.getSub(s))) {
			throw new Error("No connected flow")
		}
	}

	@test
	public gatherTreeB() {
		let first = Rx.Observable.of(1, 2, 3)
    let obs = first
      .map(_ => _)
      .filter(_ => true)
    obs.subscribe()
		let s = obs.subscribe()

		this.write("tree_b")

		if(!this.flowsFrom(this.getObs(first), this.getSub(s))) {
			throw new Error("No connected flow")
		}
	}

	@test
	public gatherTreeC() {
		let first = Rx.Observable.of(1, 2, 3)
    let shared = first.share()
		let end2 = shared.reduce((a: number, b: number) => a + b).skip(0).filter(t => true)
    let s = end2.subscribe()

		this.write("tree_c")

		if(!this.flowsFrom(this.getObs(first), this.getSub(s))) {
			throw new Error("No connected flow")
		}
	}
	
	@test
	public gatherTreeD() {
		let first = Rx.Observable.of(1, 2, 3)
    let shared = first
      .share()
		let end1 = shared.filter(_ => true)
		let end2 = shared.reduce((a: number, b: number) => a + b)
		end2.subscribe()
		let s = end1.subscribe()

		this.write("tree_d")

		if(!this.flowsFrom(this.getObs(first), this.getSub(s))) {
			throw new Error("No connected flow")
		}
	}

}
