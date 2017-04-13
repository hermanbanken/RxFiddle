import JsonCollector from "./collector/jsonCollector"
import RxRunner from "./collector/runner"
import samples from "./experiment/samples"
import CodeEditor from "./ui/codeEditor"
import { hbox, vbox, vboxo } from "./ui/flex"
import Resizer from "./ui/resizer"
import { Query, errorHandler, shareButton } from "./ui/shared"
import Splash from "./ui/splash"
import Visualizer from "./visualization"
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

type Question = {
  id: string
  render: () => VNode
}
type Test = {
  questions: Question[]
}

function renderTest(test: Test): { dom: Rx.Observable<VNode> } {
  return { dom: Rx.Observable.never<VNode>() }
}

const test: Test = {
  questions: [
    {
      id: "1",
      render: () => h("div"),
    },
  ],
}

let app = document.querySelector("body") as VNode | HTMLBodyElement
renderTest(test).dom.subscribe(vnode => {
  try {
    app = patch(app, h("body#", { tabIndexRoot: true }, [vnode]))
  } catch (e) {
    console.error("Error in snabbdom patching; restoring. Next patch will be handled clean.", e)
    app = document.querySelector("body")
  }
})

// tslint:disable:object-literal-sort-keys
// tslint:disable:max-line-length

type QuestionType = "range" | "labels"
type QuestionTypeOptions = { type: "range", min: number, max: number } | { type: "labels", min: number, max: number, labels: string[] }

function q(name: string, text: string, opts: QuestionTypeOptions) {
  let nodes: VNode[] = []
  if (opts.type === "range" || opts.type === "labels") {
    nodes.push(h("input", {
      attrs: { type: "range", min: opts.min, max: opts.max },
      on: {
        touchstart: (e: TouchEvent) => handleRangeTouch(e),
        touchmove: (e: TouchEvent) => handleRangeTouch(e),
      }
    }))
  }
  if (opts.type === "labels") {
    nodes.push(h("div.labels", opts.labels.map(l => h("span.label", l))))
  } else {
    let l = 10
    let labels = []
    for (let i = 0; i <= l; i++) {
      labels.push(h("span.label", `${opts.min + i * (opts.max - opts.min) / l}${i === l ? "+" : ""}`))
    }
    nodes.push(h("div.labels", labels))
  }

  return h("div.question", [text, ...nodes])
}

let general: VNode[] = [
  h("p", `First some general questions to get an understanding 
            of your experience (with/without Reactive Programming).`),
  q("age", "Your age:", { max: 88, min: 18, type: "range" as "range" }),

  h("h2", "Programming in general"),
  q("pr_years", "Your years of experience with programming in general:", { max: 30, min: 0, type: "range" as "range" }),
  q("pr_exp", "Access your level of experience in programming in general:", {
    max: 8, min: 0, type: "labels" as "labels",
    labels: ["none", "beginner", "medium", "senior", "expert"],
  }),
  q("pr_exp", "Compare your programming skills to your collegues. On average you are:", {
    max: 8, min: 0, type: "labels" as "labels",
    labels: ["worse", "slightly worse", "equal", "slightly better", "better"],
  }),

  h("h2", "Reactive Programming"),
  q("rp_years", "Your years of experience with Reactive Programming:", { max: 10, min: 0, type: "range" as "range" }),
  q("rp_exp", "Access your level of experience in Reactive Programming:", {
    max: 8, min: 0, type: "labels" as "labels",
    labels: ["none", "beginner", "medium", "senior", "expert"],
  }),
  q("rp_exp", "Compare your Reactive Programming skills to your collegues. On average you are:", {
    max: 8, min: 0, type: "labels" as "labels",
    labels: ["worse", "slightly worse", "equal", "slightly better", "better"],
  }),

  h("a.btn", { attrs: { href: "#main" } }, "Next"),
]

let generalVN = document.querySelector("#general") as VNode | HTMLBodyElement
generalVN = patch(generalVN, h("div#general.page", general))

function menu(runner?: RxRunner, editor?: CodeEditor): VNode {
  let clickHandler = () => {
    editor.withValue(v => {
      Query.set({ code: btoa(v), type: "editor" })
      runner.trigger()
    })
  }
  return h("div.left.flex", { attrs: { id: "menu" } }, [
    ...(runner ? [h("button.btn", { on: { click: clickHandler } }, runner.action)] : []),
  ])
}

type TestState = {
  active: string
  startTime: number
}

function testControls() {
  return h("div.testcontrols")
}

function DataSource(code: string) {
  let editor = new CodeEditor(code)
  let editedCode = Rx.Observable.fromEventPattern<string>(h => editor.withValue(h as any), h => void (0))
  let runner = new RxRunner(editedCode)
  return {
    data: runner,
    runner,
    editor,
    vnode: editor.dom,
  }
}

function SampleViewer(code: string) {
  let collector = DataSource(code)
  return Rx.Observable.of(0)
    .flatMap(_ => {
      let vis = new Visualizer(new Grapher(collector.data), document.querySelector("app") as HTMLElement)
      return vis.stream()
    })
    .catch(errorHandler)
    .retry()
    .startWith({ dom: h("span.rxfiddle-waiting", "Waiting for Rx activity..."), timeSlider: h("div") })
    .combineLatest(
    collector.vnode || Rx.Observable.just(undefined),
    collector.runner && collector.runner.state || Rx.Observable.just(undefined),
    (render, input, state) => [
      h("div#menufold-static.menufold", [
        h("a.brand.left", { attrs: { href: "#" } }, [
          h("img", { attrs: { alt: "ReactiveX", src: "RxIconXs.png" } }),
        ]),
        menu(collector.runner, collector.editor),
        h("div.right.flex", {}, [h("div.menutext", "9:59:59")]),
      ]),
      hbox(...(input ?
        [Resizer.h(
          "rxfiddle/editor+rxfiddle/inspector",
          input,
          vboxo({ class: "viewer-panel" }, /*render.timeSlider, */render.dom)
        )] :
        [vbox(/*render.timeSlider,*/ render.dom)]
      )),
    ]).map(nodes => h("div.tool.fullwidth", nodes))
}

let part1: VNode[] = [

]

let mainVN = document.querySelector("#main") as VNode | HTMLBodyElement
SampleViewer("test").subscribe(vnode => {
  mainVN = patch(mainVN, h("div#main.page", [vnode]))
})

function handleRangeTouch(e: TouchEvent) {
  let target = e.target as HTMLInputElement
  if ((target as any).type === "range") {
    let p = relPosition(target, e.touches[0])
    let x = Math.max(0, Math.min(1, p.x / target.clientWidth))
    let min = parseInt(target.min, 10)
    let max = parseInt(target.max, 10)
    target.value = `${min + (max - min) * x}`
  }
  if (e.cancelable) {
    e.preventDefault()
  }
  // return false
}

function relPosition(element: HTMLElement, event: { clientX: number, clientY: number }) {
  let offset = getPosition(element)
  return {
    x: event.clientX - offset.x,
    y: event.clientY - offset.y,
  }
}

function getPosition(element: HTMLElement) {
  let xPosition = 0
  let yPosition = 0
  while (element) {
    xPosition += (element.offsetLeft - element.scrollLeft + element.clientLeft)
    yPosition += (element.offsetTop - element.scrollTop + element.clientTop)
    element = element.offsetParent as HTMLElement
  }
  return { x: xPosition, y: yPosition }
}
