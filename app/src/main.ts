import Instrumentation, { defaultSubjects } from "./collector/instrumentation"
import Collector from "./collector/logger"
import { Visualizer } from "./collector/visualizer"
import { VNode, makeDOMDriver } from "@cycle/dom"
import { DOMSource } from "@cycle/dom/rx-typings"
import Cycle from "@cycle/rx-run"
import * as Immutable from "immutable"
import * as Rx from "rx"
import RxMarbles from "rxmarbles"

const Observable = Rx.Observable

let collector = new Collector()
let instrumentation = new Instrumentation(defaultSubjects, collector)
instrumentation.setup()
let vis = new Visualizer(instrumentation.logger, document.getElementById("graph"))
vis.step();
(<any>window).collector = collector

// Setup
RxMarbles.AddCollectionOperator(undefined)
RxMarbles.AddCollectionOperator(Rx)

interface ISources {
  DOM: DOMSource
}

interface ISinks {
  DOM: Rx.Observable<VNode>
}

function log(text: string) {
  let div = document.createElement("div")
  div.innerText = text
  document.getElementById("log").appendChild(div)
}

function main(sources: ISources): ISinks {
  let data = Immutable.fromJS({
    end: 100,
    notifications: [{
      content: "A",
      diagramId: 0,
      id: 1,
      time: 10,
    }],
  })
  const diagram = RxMarbles.DiagramComponent({
    DOM: sources.DOM, props: {
      class: "diagram",
      data: Observable.of(data, data, data),
      interactive: Observable.of(true, true, true, true),
      key: `diagram0`,
    }
  })

  diagram.DOM.map(id => id).subscribe(a => log(a + ""))
  return {
    DOM: diagram.DOM,
  }
}
/*
var A = Rx.Observable.of(1, 2, 3)
  .map(i => "Hello " + i)
  // .filter(_ => true)
  // .map(_ => _)
  .skip(1)
  .share()

var B = Rx.Observable.never()

A.flatMapLatest(s => Rx.Observable.of("bla").startWith(s))
  .groupBy(s => s[s.length - 1])
  .map(o => o.startWith("group of " + o.key))
  .mergeAll()
  .subscribe(console.log)
*/
// A.map(a => a.split("").reverse().join(""))
//   .merge(B)
//   .filter(a => true)
//   .subscribe(console.log)

Cycle.run(main, {
  DOM: makeDOMDriver("#app"),
})
