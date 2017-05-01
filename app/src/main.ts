import AnalyticsObserver from "./analytics"
import JsonCollector from "./collector/jsonCollector"
import RxRunner from "./collector/runner"
import patch from "./patch"
import CodeEditor from "./ui/codeEditor"
import { hbox, vbox, vboxo } from "./ui/flex"
import Resizer from "./ui/resizer"
import { LanguageMenu, Query, errorHandler, shareButton } from "./ui/shared"
import Splash from "./ui/splash"
import Visualizer, { DataSource } from "./visualization"
import Grapher from "./visualization/grapher"
import * as Rx from "rxjs"
import h from "snabbdom/h"
import { VNode } from "snabbdom/vnode"

//// Inception:
// import Instrumentation from "./instrumentation/rxjs-5.x.x/instrumentation"
// import { TreeCollector } from "./instrumentation/rxjs-5.x.x/collector"
// import { MessageLogger } from "../test/messageLogger"
// let i = new Instrumentation(new TreeCollector(new MessageLogger()))
// i.setup()

const DataSource$: Rx.Observable<{
  data: DataSource,
  vnode?: Rx.Observable<VNode>,
  runner?: RxRunner,
  editor?: CodeEditor,
}> = Query.$.map(q => {
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
    let runner = new RxRunner(code, AnalyticsObserver)
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

Query.$.map(query => ({ query, type: "query" })).subscribe(AnalyticsObserver)

function menu(language: VNode, runner?: RxRunner, editor?: CodeEditor): VNode {
  let clickHandler = () => {
    editor.withValue(v => {
      Query.set({ code: btoa(v), type: "editor" })
      runner.trigger()
    })
  }
  return h("div.left.ml3.flex", { attrs: { id: "menu" } }, [
    language,
    ...(runner ? [h("button.btn", { on: { click: clickHandler } }, runner.action)] : []),
    ...(editor ? [shareButton(editor)] : []),
  ])
}

const LanguageMenu$ = new LanguageMenu().stream()
const VNodes$: Rx.Observable<VNode[]> = DataSource$.switchMap(collector => {
  if (collector) {
    return Rx.Observable.of(0)
      .flatMap(_ => {
        let vis = new Visualizer(new Grapher(collector.data))
        return vis.stream(AnalyticsObserver)
      })
      .catch(errorHandler)
      .retry()
      .startWith({ dom: h("span.rxfiddle-waiting", "Waiting for Rx activity..."), timeSlider: h("div") })
      .combineLatest(
      collector.vnode || Rx.Observable.of(undefined),
      LanguageMenu$.dom,
      collector.runner && collector.runner.state || Rx.Observable.of(undefined),
      (render, input, langs, state) => [
        h("div#menufold-static.menufold", [
          h("a.brand.left", { attrs: { href: "#" } }, [
            h("img", { attrs: { alt: "ReactiveX", src: "images/RxIconXs.png" } }),
            "RxFiddle" as any as VNode,
          ]),
          menu(langs, collector.runner, collector.editor),
        ]),
        // h("div#menufold-fixed.menufold"),
        hbox(...(input ?
          [Resizer.h(
            "rxfiddle/editor+rxfiddle/inspector",
            input as any,
            vboxo({ class: "viewer-panel" }, /*render.timeSlider,*/ render.dom)
          )] :
          [vbox(/*render.timeSlider,*/ render.dom)]
        )),
      ])
  } else {
    return new Splash().stream().map(n => [h("div.flexy", [n])])
  }
})

let app = document.querySelector("body") as VNode | HTMLBodyElement
VNodes$.subscribe(vnodes => {
  try {
    app = patch(app, h("body#", { tabIndexRoot: true }, vnodes))
  } catch (e) {
    console.error("Error in snabbdom patching; restoring. Next patch will be handled clean.", e)
    app = document.querySelector("body")
  }
})
