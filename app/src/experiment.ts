// tslint:disable:object-literal-sort-keys
// tslint:disable:max-line-length
import RxRunner from "./collector/runner"
import overlay from "./experiment/overlay"
import samples, { Sample } from "./experiment/samples"
import { Screen, States, TestEvent, TestState, general, generalLangs, generalRpExperience, introScreen } from "./experiment/screens"
import { formatSeconds } from "./experiment/utils"
import patch from "./patch"
import CodeEditor from "./ui/codeEditor"
import { hboxo, vbox, vboxo } from "./ui/flex"
import Resizer from "./ui/resizer"
import { Query, errorHandler } from "./ui/shared"
import { UUID } from "./utils"
import Visualizer from "./visualization"
import { GrapherAdvanced as Grapher } from "./visualization/grapher"
import * as Rx from "rx"
import h from "snabbdom/h"
import { VNode } from "snabbdom/vnode"

// for experiment:
// load samples, concat them
// create timer
// track answers, if ok continue, else note, timeout hint, timeout again pass
//
// other:
// track all events

let initialTestState: TestState = {
  id: UUID(),
  paused: true,
  active: [],
  data: {},
}

if (localStorage) {
  let lastId = localStorage.getItem("lastSurvey")
  if (lastId) {
    initialTestState = JSON.parse(localStorage.getItem(lastId))
  } else {
    localStorage.setItem(initialTestState.id, JSON.stringify(initialTestState))
    localStorage.setItem("lastSurvey", initialTestState.id)
  }
}




let dispatcher: (event: TestEvent) => void = null
let testLoop = Rx.Observable
  .create<TestEvent>(observer => {
    dispatcher = (e) => observer.onNext(e)
  })
  .do(console.log)
  .scan<TestState>((state, event) => {
    if (event.type === "start") {
      return Object.assign({}, States.get(event.surveyId), { id: event.surveyId, paused: false, started: new Date() })
    }
    if (event.type === "answer") {
      let data = Object.assign({}, state.data)
      data[event.path[0]] = event.value
      return Object.assign({}, state, { data })
    }
    if (event.type === "goto") {
      return Object.assign({}, state, { active: event.path })
    }
    if (event.type === "pause") {
      return Object.assign({ paused: true }, state, { paused: true })
    }
    if (event.type === "pass") {
      let data = Object.assign({}, state.data)
      data[event.question] = Object.assign({}, data[event.question], { passed: true })
      return Object.assign({}, state, { data })
    }
    return state
  }, initialTestState)
  .startWith(initialTestState)
  .do(s => { States.save(s) })
  .do(console.log)
  .map(state => {
    let screen: Screen
    let screens = [general, generalLangs, generalRpExperience, testScreen(Rx.Scheduler.default), doneScreen]
    if (state.paused) {
      screen = introScreen
    } else {
      screen = screens.find(s => s.isActive(state))
    }
    if (!screen) {
      return Rx.Observable.never()
    }

    /*
h("div#menufold-static.menufold.noflex", [
  h("a.brand.left", [
    h("img", { attrs: { alt: "ReactiveX", src: "RxIconXs.png" } }),
    h("span", "Survey"),
  ]),
  h("div.left.flex", { attrs: { id: "menu" } }, [
    h("button.btn", { on: { click: () => { } } }, "Back"),
  ]),
  h("div", { style: { flex: "1" } }),
]),    
     */
    let { dom } = screen.render(state, e => dispatcher(e))

    if (!screen.hasMenu) {
      return dom.map(nodes => h("div.tool.flexy.flexy-v.rel", [
        h("div#menufold-static.menufold", [
          h("a.brand.left", { attrs: { href: "#" } }, [
            h("img", { attrs: { alt: "ReactiveX", src: "RxIconXs.png" } }),
          ]),
          h("div", { style: { flex: "1" } }),
          h("div.right", [
            ...testMenu(state, t => dispatcher(t)),
            h("button.btn", "JavaScript cheatsheet"),
            h("button.btn", "RxJS docs"),
            h("button.btn.helpbutton", "Help"),
            overlay(),
          ]),
        ]),
        nodes,
      ]))
    }

    return dom
  })
  .switchLatest()





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

function formatQuestion(sample: Sample, time: Rx.Observable<number>, dispatcher: (event: TestEvent) => void): Rx.Observable<VNode> {
  return sample.renderQuestion(dispatcher).flatMap(render =>
    time.map(t => h("div.question-bar", h("div.question-wrapper", {
      key: sample.question.toString(), style: {
        "margin-top": "-100%",
        delayed: { "margin-top": "0%" },
        remove: { "margin-top": "-100%" },
      },
    }, [
        h("div.countdown.right", [
          formatSeconds((sample.timeout || 600) - t),
        ]),
        h("h1", "Question"),
        render,
      ]))
    ))
}

function testMenu(state: TestState, dispatcher: (event: TestEvent) => void, index?: number) {
  return [
    state && state.paused ? undefined : h("button.btn", {
      on: { click: () => dispatcher({ type: "pause" }) },
    }, "Pause"),
    typeof index === "number" ? h("button.btn", {
      attrs: { title: "Skip to next question" },
      on: { click: () => confirm("Are you sure you to pass on this question?") && dispatcher({ type: "pass", question: index }) },
    }, "Pass") : undefined,
  ]
}

let doneScreen: Screen = {
  isActive: (state) => true,
  progress: () => ({ max: 0, done: 0 }),
  render: (state, dispatcher) => ({
    dom: Rx.Observable.just(h("div", ["Done", h("a.btn", {
      on: { click: () => dispatcher({ type: "pause" }) },
    }, "Back")])),
  }),
}

/* Screen containing RxFiddle */
let testScreen = (scheduler: Rx.IScheduler): Screen => ({
  isActive: (state) => state.active[0] === "test" && samples.some((s, index) => !state.data[index] || !(state.data[index].passed || state.data[index].completed)),
  progress: () => ({ max: 0, done: 0 }),
  hasMenu: true,
  render: (state, dispatcher) => ({
    dom: Rx.Observable.defer(() => {
      let index = samples.findIndex((s, index) => !state.data[index] || !(state.data[index].passed || state.data[index].completed))
      let sample = samples[index]
      let collector = DataSource(sample)

      let question = Rx.Observable.interval(1000, scheduler)
        .startWith(0)
        .take(sample.timeout)
        .let(time => formatQuestion(sample, time, dispatcher))

      let active = Rx.Observable
        .defer(() => {
          let vis = new Visualizer(new Grapher(collector.data), document.querySelector("app") as HTMLElement)
          return vis.stream()
        })
        .catch(errorHandler)
        .retry()
        .combineLatest(
        question.do(vn => console.log("question")),
        collector.vnode.do(vn => console.log("vnode")),
        collector.runner.state.do(vn => console.log("runner.state")),
        (visualizer, questiondom, input) => [
          questiondom,
          vboxo({ class: "rel" },
            h("div#menufold-static.menufold.belowquestion", [
              h("a.brand.left", { attrs: { href: "#" } }, [
                h("img", { attrs: { alt: "ReactiveX", src: "RxIconXs.png" } }),
              ]),
              menu(collector.runner, collector.editor),
              h("div", { style: { flex: "1" } }),
              h("div.right", [
                ...testMenu(state, dispatcher, index),
                h("button.btn", "JavaScript cheatsheet"),
                h("button.btn", "RxJS docs"),
                h("button.btn.helpbutton", "Help"),
                overlay(),
              ]),
            ]),
            hboxo({ class: "editor-visualizer" }, Resizer.h(
              "rxfiddle/editor+rxfiddle/inspector",
              input,
              vboxo({ class: "viewer-panel" }, visualizer.dom)
            )),
          ),
        ])

      let outOfTime: Rx.Observable<VNode[]> = Rx.Observable.just(sample.timeout)
        .let(time => formatQuestion(sample, time, dispatcher))
        .map((render) => [
          render,
          h("div.center", h("div", { style: { padding: "3em" } }, [
            h("h2", "time's up"),
            h("a.btn", { on: { click: () => dispatcher({ type: "pass", question: index }) } }, "Continue with next question"),
            h("p.gray", { style: { width: "21em", "margin-left": "auto", "margin-right": "auto", color: "gray" } },
              `Don't worry. After the survey, you may spend all the time you
               want in this tool. Your questions, your code and your answers
               will be available at the end of the survey, if you wish.`),
          ])),
        ])

      return Rx.Observable.of(active)
        .merge(Rx.Observable.timer(1000 * sample.timeout, scheduler).map(_ => outOfTime))
        .switch()
        .map(nodes => h("div.tool.flexy.flexy-v.rel", nodes))
    }),
  }),
})

function DataSource(sample: Sample) {
  let editor = new CodeEditor(sample.code.trim(), sample.codeRanges && sample.codeRanges(), sample.lineClasses && sample.lineClasses())
  let editedCode = Rx.Observable.fromEventPattern<string>(h => editor.withValue(h as any), h => void (0))
  let runner = new RxRunner(editedCode.map(c => sample.renderCode ? sample.renderCode(c) : c))
  return {
    data: runner,
    runner,
    editor,
    vnode: editor.dom,
  }
}

let scheduler = Rx.Scheduler.default
//  (window as any).scheduler = new Rx.TestScheduler()
// scheduler.advanceTo(Date.now())
// setInterval(() => scheduler.advanceBy(200), 200)

let screens = [
  // introScreen, 
  // generalScreens,
  testScreen(scheduler),
]

let mainVN = document.querySelector("#experiment") as VNode | HTMLBodyElement
// Rx.Observable
// .of(...screens)
// .concatMap(_ => _.dom)
// .subscribe(vnode => {
//   mainVN = patch(mainVN, h("div#screens", [vnode]))
// })

testLoop
  .subscribe(vnode => {
    mainVN = patch(mainVN, h("div#screens", vnode))
  })
