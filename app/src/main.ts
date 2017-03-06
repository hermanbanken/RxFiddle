import JsonCollector from "./collector/jsonCollector"
// import Collector from "./collector/logger"
import Visualizer, { DataSource, Grapher } from "./visualization"
import MorphModule from "./visualization/morph"
// import { VNode, makeDOMDriver } from "@cycle/dom"
// import { DOMSource } from "@cycle/dom/rx-typings"
// import Cycle from "@cycle/rx-run"
// import RxMarbles from "rxmarbles"
// import * as Immutable from "immutable"
import * as Rx from "rx"
import { init as snabbdom_init } from "snabbdom"
import h from "snabbdom/h"
import attrs_module from "snabbdom/modules/attributes"
import class_module from "snabbdom/modules/class"
import event_module from "snabbdom/modules/eventlisteners"
import style_module from "snabbdom/modules/style"
import toVNode from "snabbdom/toVNode"
import { VNode } from "snabbdom/vnode"

const patch = snabbdom_init([class_module, attrs_module, style_module, event_module, MorphModule])

class CodeEditor {
  public dom: Rx.Observable<VNode>
  constructor() {
    let frame = document.createElement("iframe")
    frame.src = "editor.html"
    this.dom = Rx.Observable.just(h("div.editor", [h("iframe", {
      attrs: { src: "editor.html" },
    })]))
  }
}

class PostWindowCollector implements DataSource {
  public dataObs: Rx.Observable<any>
  constructor() {
    this.dataObs = Rx.Observable.fromEvent(window, "message", (e: any) => {
      // For Chrome, the origin property is in the event.originalEvent object.
      let origin = e.origin || (e as any).originalEvent.origin
      if (origin !== window.location.origin) {
        return
      }
      return e.data
    })
  }
}

const Query$ = Rx.Observable
  .fromEvent(window, "hashchange", () => window.location.hash.substr(1))
  .startWith(window.location.hash.substr(1))
  .map(queryString => {
    return queryString.split("&").map(p => p.split("=")).reduce((p: any, n: string[]) => {
      if (n[0].endsWith("[]")) {
        let key = n[0].substr(0, n[0].length - 1)
        p[key] = p[key] || []
        p[key].push(n[1])
      } else {
        p[n[0]] = n[1]
      }
      return p
    }, {}) || {}
  })

const DataSource$: Rx.Observable<{ data: DataSource, vnode?: Rx.Observable<VNode> }> = Query$.map(q => {
  if (q.type === "demo" && q.source) {
    let collector = new JsonCollector()
    collector.restart(q.source)
    return { data: collector }
  } else if (q.type === "ws" && q.url) {
    let collector = new JsonCollector()
    collector.restart(q.url)
    return { data: collector }
  } else if (q.type === "editor") {
    let editor = new CodeEditor()
    return { data: new PostWindowCollector(), vnode: editor.dom }
  } else {
    return null
  }
})

function Resizer(target: VNode): VNode {
  return h("div.resizer", {
    on: (e: Event) => console.log("Start resize", e.target),
  })
}

function errorHandler(e: Error): Rx.Observable<VNode> {
  let next = Rx.Observable.create(sub => sub.onError(new Error("Continue"))).delay(500)
  return Rx.Observable.just(h("div", "Krak!")).merge(next)
}

const VNodes$: Rx.Observable<VNode[]> = DataSource$.flatMap(collector => {
  console.log("Collector", collector)
  if (collector) {
    return new Visualizer(new Grapher(collector.data), document.querySelector("app") as HTMLElement)
      .stream()
      .startWith(h("span", "Waiting for Rx activity..."))
      .catch(errorHandler)
      .retry()
      .combineLatest(collector.vnode || Rx.Observable.just(undefined), (render: VNode, input: VNode) => [
        h("div#menufold-static.menufold", [h("a", { attrs: { href: "#" } }, [
          h("img", { attrs: { alt: "ReactiveX", src: "RxIconXs.png" } }),
          "RxFiddle" as any as VNode,
        ])]),
        // h("div#menufold-fixed.menufold"),
        h("div.flexy", input ? [input, Resizer(input), render] : [render]),
      ])
  } else {
    return new Splash().stream().map(n => [h("div.flexy", [n])])
  }
})

class Splash {
  public stream() {
    return Rx.Observable.create<VNode>(subscriber => {
      let vnode = h("div", { attrs: { class: "splash " } }, [h("div", { attrs: { class: "welcome" } }, [
        h("h1", [h("img", { attrs: { alt: "ReactiveX", src: "RxLogo.png" } }), "RxFiddle"]),
        h("h2", ["Visualize your Observables."]),

        h("p", ["Select an input:"]),
        h("div", [h("a", { attrs: { class: "btn", href: "#type=editor" } }, "Live Editor")]),
        h("div", ["Static Demos: ",
          h("a", { attrs: { class: "btn", href: "#source=tree_a.json&type=demo" } }, "A"),
          h("a", { attrs: { class: "btn", href: "#source=tree_b.json&type=demo" } }, "B"),
          h("a", { attrs: { class: "btn", href: "#source=tree_c.json&type=demo" } }, "C"),
          h("a", { attrs: { class: "btn", href: "#source=tree_d.json&type=demo" } }, "D"),
          h("a", { attrs: { class: "btn", href: "#source=tree_e.json&type=demo" } }, "E"),
          h("a", { attrs: { class: "btn", href: "#source=tree_f.json&type=demo" } }, "F"),
        ]),
        h("div", [h("div", { attrs: { class: "inputbar" } }, [
          h("input", { attrs: { placeholder: "WebSocket debugger url, e.g. ws://localhost:1337", type: "text" } })]),
        ]),
        h("div", [h("label", { attrs: { class: "btn rel" } }, [
          h("input", { attrs: { type: "file" } }), h("span", "Load a JSON log file")])
        ]),
      ])])
      subscriber.onNext(vnode)
    })
  }
}

let app = document.querySelector("body") as VNode | HTMLBodyElement
VNodes$.subscribe(vnodes => {
  try {
    app = patch(app, h("body#", vnodes))
  } catch (e) {
    console.error("Error in snabbdom patching; restoring. Next patch will be handled clean.", e)
    app = document.querySelector("body")
  }
})

// Make Rx available to Chrome console
let scope = window as any
scope.Rx = Rx

// let collector = new JsonCollector()
// // let collector = new Collector()
// // let instrumentation = new Instrumentation(defaultSubjects, collector)
// // instrumentation.setup()
// let vis = new Visualizer(
//   new Grapher(collector),
//   document.querySelector("app") as HTMLElement,
//   document.getElementById("controls")
// )

// vis.step();
// (window as any).collector = collector;
// (window as any).visualizer = vis;

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

// function c() {
//   // Setup
//   RxMarbles.AddCollectionOperator(undefined)
//   RxMarbles.AddCollectionOperator(Rx)

//   interface ISources {
//     DOM: DOMSource
//   }

//   interface ISinks {
//     DOM: Rx.Observable<VNode>
//   }
//   function main(sources: ISources): ISinks {
//     let data = Immutable.fromJS({
//       end: 100,
//       notifications: [{
//         content: "A",
//         diagramId: 0,
//         id: 1,
//         time: 10,
//       }],
//     })
//     const diagram = RxMarbles.DiagramComponent({
//       DOM: sources.DOM, props: {
//         class: "diagram",
//         data: Observable.of(data, data, data),
//         interactive: Observable.of(true, true, true, true),
//         key: `diagram0`,
//       }
//     })

//     return {
//       DOM: diagram.DOM,
//     }
//   }
//   Cycle.run(main, {
//     DOM: makeDOMDriver("#app"),
//   })
// }

// document.getElementById("a").onclick = run.bind(null, a)
// document.getElementById("a").onclick = () => { source = "tree_a.json"; collector.restart(source) }
// document.getElementById("b").onclick = () => { source = "tree_b.json"; collector.restart(source) }
// document.getElementById("c").onclick = () => { source = "tree_c.json"; collector.restart(source) }
// document.getElementById("d").onclick = () => { source = "tree_d.json"; collector.restart(source) }
// document.getElementById("e").onclick = () => { source = "tree_e.json"; collector.restart(source) }
// document.getElementById("f").onclick = () => { source = "tree_f.json"; collector.restart(source) }
// let trace = document.getElementById("trace") as HTMLInputElement
// let ids = document.getElementById("showIds") as HTMLInputElement

// trace.addEventListener("click", () => {
//   // instrumentation.stackTraces = trace.checked
// })

// ids.addEventListener("click", () => {
//   // vis.showIds = ids.checked
// })

// c()
