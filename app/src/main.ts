import Instrumentation, { defaultSubjects } from "./collector/instrumentation"
import Collector from "./collector/logger"
import { Visualizer } from "./collector/visualizer"
import { VNode, makeDOMDriver } from "@cycle/dom"
import { DOMSource } from "@cycle/dom/rx-typings"
import Cycle from "@cycle/rx-run"
import * as Immutable from "immutable"
import * as Rx from "rx"
import RxMarbles from "rxmarbles"
import JsonCollector from "./collector/jsonCollector"

const Observable = Rx.Observable

// let collector = new JsonCollector("C.json")
let collector = new Collector()
let instrumentation = new Instrumentation(defaultSubjects, collector)
instrumentation.setup()
let vis = new Visualizer(
  // collector,
  instrumentation.logger,
  document.querySelector("app") as HTMLElement,
  document.getElementById("controls")
)

vis.step();
(<any>window).collector = collector;
(<any>window).visualizer = vis;
(<any>window).Rx = Rx

//      /\    
//     /  \   
//    / /\ \  
//   / ____ \ 
//  /_/    \_\

function a() {
  Rx.Observable.of(1, 2, 3)
    .map(s => s)
    .groupBy(v => v)
    .mergeAll()
    .subscribe()
}

//  ____  
// |  _ \ 
// | |_) |
// |  _ < 
// | |_) |
// |____/ 

// Rx.Observable.create(subscriber => {
//   subscriber.onNext("hi!")
//   subscriber.onNext("boo")
//   subscriber.onCompleted()
// })

function b() {
  var A = Rx.Observable.interval(1000)
    .map(i => "Hello " + i)
    .filter(_ => true)
    .map(_ => _)
    .skip(1)
    .publish()
  var B = Rx.Observable.never()

  A.flatMapLatest(s => Rx.Observable.of("bla").startWith(s))
    .groupBy(s => s[s.length - 1])
    .map(o => o.startWith("group of " + o.key))
    .mergeAll()
    .subscribe(console.log)

  A.map(a => a.split("").reverse().join(""))
    .merge(B)
    .filter(a => true)
    .subscribe(console.log)

  A.connect()
}

//    _____ 
//   / ____|
//  | |     
//  | |     
//  | |____ 
//   \_____|

function c() {
  // Setup
  RxMarbles.AddCollectionOperator(undefined)
  RxMarbles.AddCollectionOperator(Rx)

  interface ISources {
    DOM: DOMSource
  }

  interface ISinks {
    DOM: Rx.Observable<VNode>
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

    return {
      DOM: diagram.DOM,
    }
  }
  Cycle.run(main, {
    DOM: makeDOMDriver("#app"),
  })
}

function run(m: Function) {
  m()
}


document.getElementById("a").onclick = run.bind(null, a)
document.getElementById("b").onclick = run.bind(null, b)
document.getElementById("c").onclick = run.bind(null, c)
let trace = document.getElementById("trace") as HTMLInputElement
let ids = document.getElementById("showIds") as HTMLInputElement

trace.addEventListener("click", () => {
  // instrumentation.stackTraces = trace.checked
})

ids.addEventListener("click", () => {
  vis.showIds = ids.checked
})

c()
