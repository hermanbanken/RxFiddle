import JsonCollector from "./collector/jsonCollector"
import RxRunner, { RxRunnerState } from "./collector/runner"
import { LanguageCombination } from "./languages"
import Visualizer, { DataSource } from "./visualization"
import { GrapherAdvanced as Grapher } from "./visualization/grapher"
import MorphModule from "./visualization/morph"
import TabIndexModule from "./visualization/tabIndexQuickDirty"
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

const sameOriginWindowMessages = Rx.Observable
  .fromEvent(window, "message", (e: any) => {
    // For Chrome, the origin property is in the event.originalEvent object.
    let origin = e.origin || (e as any).originalEvent.origin
    if (origin !== window.location.origin) {
      return
    }

    return e.data
  })
  .flatMap(event => {
    // Emit Editor errors in this stream; todo: move this throw elsewhere
    if (event && event.type === "error") {
      return Rx.Observable.create(o => o.onError(event.error))
    }
    return Rx.Observable.just(event)
  })

sameOriginWindowMessages
  .map(_ => _.hash)
  .filter(_ => typeof _ !== "undefined")
  .subscribe(hash => {
    window.location.hash = formatHash(hash)
  }, e => { /* */ })

class CodeEditor {
  public dom: Rx.Observable<VNode>
  private frameWindow: Window = null

  constructor(initialSource?: string) {
    let src: string
    if (typeof initialSource !== "string" && localStorage && localStorage.getItem("code")) {
      initialSource = localStorage.getItem("code")
    }
    if (typeof initialSource === "string" && initialSource) {
      src = "editor.html#blob=" + encodeURI(btoa(initialSource))
    } else {
      src = "editor.html"
    }
    this.dom = sameOriginWindowMessages
      .startWith({})
      .scan((prev, message) => {
        return Object.assign(prev, message)
      }, {})
      .map(state => h("div.editor", {
        style: {
          "max-width": `${Math.max(400, state.desiredWidth)}px`,
          "min-width": `${Math.max(400, state.desiredWidth)}px`,
        },
      }, [h("iframe", {
        attrs: { src },
      })]))
  }

  public send(object: any) {
    if (this.prepare()) {
      this.frameWindow.postMessage(object, window.location.origin)
    }
  }

  public withValue(cb: (code: string) => void) {
    if (this.prepare()) {
      sameOriginWindowMessages
        .take(1)
        .map(d => d.code)
        .do(code => localStorage && localStorage.setItem("code", code))
        .subscribe(cb)
      this.frameWindow.postMessage("requestCode", window.location.origin)
    }
  }

  private prepare(): boolean {
    if (!this.frameWindow) {
      let frame = document.querySelector("iframe")
      this.frameWindow = frame && frame.contentWindow
    }
    return this.frameWindow && true || false
  }
}

// For debug purposes
let messages: any[] = (window as any).messages = []

class PostWindowCollector implements DataSource {
  public dataObs: Rx.Observable<any> = sameOriginWindowMessages.do(m => messages.push(m))
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
  runner?: RxRunner,
  editor?: CodeEditor,
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
    let code = Rx.Observable.fromEventPattern<string>(h => editor.withValue(h as any), h => void (0))
    let runner = new RxRunner(code)
    return {
      data: runner,
      runner,
      editor,
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
      ])), language: Rx.Observable.never<LanguageCombination>(),
    }
  }
}

function errorHandler(e: Error): Rx.Observable<{ dom: VNode, timeSlider: VNode }> {
  let next = Rx.Observable.create(sub => {
    setTimeout(() => sub.onError(new Error("Continue")), 5000)
  })
  return Rx.Observable.just({
    dom: h("div", [
      h("p", `Krak!`),
      h("p", `Global error handling (anything not Rx onError's ) is not yet done. 
      Also, please make sure to handle errors in your subscribe calls, otherwise they bubble into global errors!`),
      h("a.btn", { attrs: { href: "javascript:window.location.reload()" } }, "Reload"),
      h("textarea",
        { style: { height: "50vh", overflow: "auto", width: "50vw" } },
        e.stack || JSON.stringify(e, null, 2)
      ),
    ]), timeSlider: h("div"),
  }).merge(next)
}

function shareButton(editor: CodeEditor) {
  return h("button.btn", {
    on: {
      click: (e: MouseEvent) => {
        editor.withValue(v => {
          window.location.hash = formatHash({ code: btoa(v), type: "editor" })
          let original = (e.target as HTMLButtonElement).innerText;
          (e.target as HTMLButtonElement).innerText = "Saved state in the url. Copy the url!"
        })
      },
      mouseout: (e: MouseEvent) => {
        (e.target as HTMLButtonElement).innerText = "Share"
      },
    },
  }, "Share")
}

function menu(language: VNode, runner?: RxRunner, editor?: CodeEditor): VNode {
  //             collector.runner && collector.runner.action,
  // () => collector.runner && collector.runner.trigger()

  return h("div.left.ml3.flex", { attrs: { id: "menu" } }, [
    language,
    ...(runner ? [h("button.btn", { on: { click: () => runner.trigger() } }, runner.action)] : []),
    ...(editor ? [shareButton(editor)] : []),
  ])
}

const LanguageMenu$ = new LanguageMenu().stream()
const VNodes$: Rx.Observable<VNode[]> = DataSource$.flatMapLatest(collector => {
  if (collector) {
    let vis = new Visualizer(new Grapher(collector.data), document.querySelector("app") as HTMLElement)
    return vis
      .stream()
      .startWith({ dom: h("span.rxfiddle-waiting", "Waiting for Rx activity..."), timeSlider: h("div") })
      .catch(errorHandler)
      .retry()
      .combineLatest(
      collector.vnode || Rx.Observable.just(undefined),
      LanguageMenu$.dom,
      collector.runner && collector.runner.state || Rx.Observable.just(undefined),
      (render, input, langs, state) => [
        h("div#menufold-static.menufold", [
          h("a.brand.left", { attrs: { href: "#" } }, [
            h("img", { attrs: { alt: "ReactiveX", src: "RxIconXs.png" } }),
            "RxFiddle" as any as VNode,
          ]),
          menu(langs, collector.runner, collector.editor),
        ]),
        // h("div#menufold-fixed.menufold"),
        hbox(...(input ?
          [input, Resizer(input), vbox(render.timeSlider, render.dom)] :
          [vbox(render.timeSlider, render.dom)]
        )),
      ])
  } else {
    return new Splash().stream().map(n => [h("div.flexy", [n])])
  }
})

function vbox(...nodes: VNode[]) {
  return h("div.flexy.flexy-v", nodes)
}
function hbox(...nodes: VNode[]) {
  return h("div.flexy", nodes)
}

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
