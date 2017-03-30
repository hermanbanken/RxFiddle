import JsonCollector from "./collector/jsonCollector"
// import Collector from "./collector/logger"
import { LanguageCombination } from "./languages"
import Visualizer, { DataSource } from "./visualization"
import { GrapherAdvanced as Grapher } from "./visualization/grapher"
import MorphModule from "./visualization/morph"
import TabIndexModule from "./visualization/tabIndexQuickDirty"
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
import { VNode } from "snabbdom/vnode"

const patch = snabbdom_init([class_module, attrs_module, style_module, event_module, MorphModule, TabIndexModule])

function formatHash(object: any): string {
  let q = ""
  for (let k in object) {
    if (object.hasOwnProperty(k)) {
      q += (q ? "&" : "") + k + "=" + object[k]
    }
  }
  return q
}

const sameOriginWindowMessages = Rx.Observable.fromEvent(window, "message", (e: any) => {
  // For Chrome, the origin property is in the event.originalEvent object.
  let origin = e.origin || (e as any).originalEvent.origin
  if (origin !== window.location.origin) {
    return
  }
  return e.data
})

sameOriginWindowMessages
  .map(_ => _.hash)
  .filter(_ => typeof _ !== "undefined")
  .subscribe(hash => {
    window.location.hash = formatHash(hash)
  })

class CodeEditor {
  public dom: Rx.Observable<VNode>
  private frameWindow: Window = null

  constructor(initialSource?: string) {
    let src = initialSource ? "editor.html#blob=" + encodeURI(btoa(initialSource)) : "editor.html"
    this.dom = Rx.Observable.just(h("div.editor", [h("iframe", {
      attrs: { src },
    })]))
  }

  public send(object: any) {
    if (!this.frameWindow) {
      let frame = document.querySelector("iframe")
      this.frameWindow = frame && frame.contentWindow
    }
    if (this.frameWindow) {
      this.frameWindow.postMessage(object, window.location.origin)
    }
  }
}

class PostWindowCollector implements DataSource {
  public dataObs: Rx.Observable<any> = sameOriginWindowMessages
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

const DataSource$: Rx.Observable<{
  data: DataSource,
  vnode?: Rx.Observable<VNode>,
  run?: () => void
}> = Query$.map(q => {
  if (q.type === "demo" && q.source) {
    let collector = new JsonCollector()
    collector.restart(q.source)
    return { data: collector }
  } else if (q.type === "ws" && q.url) {
    let collector = new JsonCollector()
    collector.restart(q.url)
    return { data: collector }
  } else if (q.type === "editor") {
    let editor = new CodeEditor(q.code ? atob(decodeURI(q.code)) : undefined)
    return {
      data: new PostWindowCollector(),
      run: editor.send.bind(editor, "run"),
      vnode: editor.dom,
    }
  } else {
    return null
  }
})

function Resizer(target: VNode): VNode {
  return h("div.resizer", {
    on: (e: Event) => console.log("Start resize", e.target),
  })
}

class LanguageMenu {
  public stream(): { dom: Rx.Observable<VNode>, language: Rx.Observable<LanguageCombination> } {
    return {
      dom: Rx.Observable.just(h("div.select", [
        h("div.selected", "RxJS 4"),
        h("div.options", [
          h("div.option", "RxJS 4"),
          h("div.option", h("a",
            { attrs: { href: "https://github.com/hermanbanken/RxFiddle/pulls" } },
            "issue Pull Request"
          )),
        ]),
      ])), language: Rx.Observable.never<LanguageCombination>()
    }
  }
}

function errorHandler(e: Error): Rx.Observable<{ dom: VNode, timeSlider: VNode }> {
  let next = Rx.Observable.create(sub => {
    console.error(e);
    setTimeout(() => sub.onError(new Error("Continue")), 1000)
  })
  return Rx.Observable.just({ dom: h("div", "Krak!"), timeSlider: h("div") }).merge(next)
}

function menu(time: VNode, language: VNode, run?: () => void): VNode {
  return h("div.left.ml3.flex", { attrs: { id: "menu" } }, [
    ...(run ? [h("button.btn", { on: { click: () => run && run() } }, "Run")] : []),
    language,
    h("div.menutext", "time:"),
    time,
  ])
}

const LanguageMenu$ = new LanguageMenu().stream()
const VNodes$: Rx.Observable<VNode[]> = DataSource$.flatMapLatest(collector => {
  if (collector) {
    let vis = new Visualizer(new Grapher(collector.data), document.querySelector("app") as HTMLElement)
    return vis
      .stream()
      .startWith({ dom: h("span", "Waiting for Rx activity..."), timeSlider: h("div") })
      .catch(errorHandler)
      .retry()
      .combineLatest(collector.vnode || Rx.Observable.just(undefined), LanguageMenu$.dom, (render, input, langs) => [
        h("div#menufold-static.menufold", [
          h("a.brand.left", { attrs: { href: "#" } }, [
            h("img", { attrs: { alt: "ReactiveX", src: "RxIconXs.png" } }),
            "RxFiddle" as any as VNode,
          ]),
          menu(render.timeSlider, langs, collector.run),
        ]),
        // h("div#menufold-fixed.menufold"),
        h("div.flexy", input ? [input, Resizer(input), render.dom] : [render.dom]),
      ])
  } else {
    return new Splash().stream().map(n => [h("div.flexy", [n])])
  }
})

class Splash {
  public stream() {
    return Rx.Observable.create<VNode>(subscriber => {
      let debugOptions: VNode[] = [
        h("span.separator", "or"),
        h("label.launchOption", [
          h("span", "Static Demos"),
          h("div", { attrs: { style: "display: flex" } }, [
            h("a", { attrs: { class: "btn", href: "#source=../dist/tree_a.json&type=demo" } }, "A"), " ",
            h("a", { attrs: { class: "btn", href: "#source=../dist/tree_b.json&type=demo" } }, "B"), " ",
            h("a", { attrs: { class: "btn", href: "#source=../dist/tree_c.json&type=demo" } }, "C"), " ",
            h("a", { attrs: { class: "btn", href: "#source=../dist/tree_d.json&type=demo" } }, "D"), " ",
            h("a", { attrs: { class: "btn", href: "#source=../dist/tree_e.json&type=demo" } }, "E"), " ",
            h("a", { attrs: { class: "btn", href: "#source=../dist/tree_f.json&type=demo" } }, "F"), " ",
          ] as Array<VNode>),
        ]),
      ]

      let vnode = h("div", { attrs: { class: "splash " } }, [h("div", { attrs: { class: "welcome" } }, [
        h("h1", [h("img", { attrs: { alt: "ReactiveX", src: "RxLogo.png" } }), "RxFiddle"]),
        h("h2", ["Visualize your Observables."]),

        h("p", ["Select an input:"]),

        h("label.launchOption", [
          h("span", "In-browser editor"),
          h("a.btn", { attrs: { href: "#type=editor" } }, "Start Editor"),
        ]),

        h("span.separator", "or"),

        h("label.launchOption", [
          h("span", "WebSocket debugger"),
          h("form", { attrs: { method: "get", style: "display: flex" } }, [
            h("div.inputbar", [
              h("input", { attrs: { placeholder: "url, e.g. ws://localhost:1337", type: "text" } }),
            ]),
            h("button.btn", "Connect"),
          ]),
        ]),

        /* Not yet supported JSON load
        h("span.separator", "or"),

        h("label.launchOption", [
          h("span", "Import"),
          h("form", { attrs: { method: "get", style: "display: flex" } }, [
            h("div", [h("label.btn.rel", [
              h("input", { attrs: { type: "file" } }), h("span", "Load a JSON log file")]),
            ]),
          ]),
        ]),
        */

        ...debugOptions,
      ])])
      subscriber.onNext(vnode)
    })
  }
}

let app = document.querySelector("body") as VNode | HTMLBodyElement
VNodes$.subscribe(vnodes => {
  try {
    app = patch(app, h("body#", { tabIndexRoot: true }, vnodes))
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
