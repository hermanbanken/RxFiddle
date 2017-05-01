// tslint:disable:ob§ect-literal-sort-keys
// tslint:disable:max-line-length
import AnalyticsObserver from "./analytics"
import RxRunner, { Runner } from "./collector/runner"
import ConsoleRunner from "./experiment/console-runner"
import ConsoleVisualizer from "./experiment/console-visualizer"
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
import RxFiddleVisualizer from "./visualization"
import Grapher from "./visualization/grapher"
import * as Rx from "rxjs"
import { IScheduler } from "rxjs/Scheduler"
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

if (typeof localStorage !== "undefined") {
  let lastId = localStorage.getItem("lastSurvey")
  if (lastId) {
    initialTestState = JSON.parse(localStorage.getItem(lastId))
  } else {
    localStorage.setItem(initialTestState.id, JSON.stringify(initialTestState))
    localStorage.setItem("lastSurvey", initialTestState.id)
  }
}

let dispatcher: (event: TestEvent) => void = null
let testLoop = new Rx.Observable<TestEvent>(observer => {
  dispatcher = (e) => {
    observer.next(e)
    AnalyticsObserver.next(e)
  }
})
  .do(console.log)
  .scan((state: TestState, event: TestEvent): TestState => {
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
  .do((s: TestState) => { States.save(s) })
  .do(console.log)
  .map((state: TestState) => {
    let screen: Screen
    let screens = [general, generalLangs, generalRpExperience, testScreen(Rx.Scheduler.asap), doneScreen]
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
    h("img", { attrs: { alt: "ReactiveX", src: "images/RxIconXs.png" } }),
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
            h("img", { attrs: { alt: "ReactiveX", src: "images/RxIconXs.png" } }),
            "RxFiddle" as any as VNode,
          ]),
          h("div", { style: { flex: "1" } }),
          h("div.right", [
            ...testMenu(state, t => dispatcher(t)),
            ...rightMenuLinks,
            h("button.btn.helpbutton", "Help"),
            overlay(),
          ]),
        ]),
        nodes,
      ]))
    }

    return dom
  })
  .switch()



function menu(runner?: Runner, editor?: CodeEditor): VNode {
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

let rightMenuLinks = [
  h("a.btn", { attrs: { href: "faq.html" } }, "FAQ"),
  h("a.btn", { attrs: { href: "cheatsheet.html" } }, "JavaScript cheatsheet"),
  h("a.btn", { attrs: { href: "http://reactivex.io", target: "_blank" } }, "RxJS docs"),
]

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
    dom: Rx.Observable.of(h("div", ["Done", h("a.btn", {
      on: { click: () => dispatcher({ type: "pause" }) },
    }, "Back")])),
  }),
}

let useRxFiddle = false

/* Screen containing RxFiddle */
let testScreen = (scheduler: IScheduler): Screen => ({
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
          if (useRxFiddle) {
            let vis = new RxFiddleVisualizer(new Grapher(collector.data))
            return vis.stream(AnalyticsObserver)
          } else {
            let vis = new ConsoleVisualizer(collector.data as ConsoleRunner)
            return vis.dom.map(dom => ({ dom, timeSlider: h("div") }))
          }
        })
        .catch(errorHandler)
        .retry()
        .combineLatest(
        question,
        collector.vnode,
        collector.runner.state,
        (visualizer, questiondom, input) => [
          questiondom,
          vboxo({ class: "rel" },
            h("div#menufold-static.menufold.belowquestion", [
              h("a.brand.left", { attrs: { href: "#" } }, [
                h("img", { attrs: { alt: "ReactiveX", src: "images/RxIconXs.png" } }),
                "RxFiddle" as any as VNode,
              ]),
              menu(collector.runner, collector.editor),
              h("div", { style: { flex: "1" } }),
              h("div.right", [
                ...testMenu(state, dispatcher, index),
                ...rightMenuLinks,
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

      let outOfTime: Rx.Observable<VNode[]> = Rx.Observable.of(sample.timeout)
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
  let runner: Runner
  if (useRxFiddle) {
    runner = new RxRunner(editedCode.map(c => sample.renderCode ? sample.renderCode(c) : c), AnalyticsObserver)
  } else {
    runner = new ConsoleRunner(editedCode.map(c => sample.renderCode ? sample.renderCode(c) : c), AnalyticsObserver)
  }
  return {
    data: runner,
    runner,
    editor,
    vnode: editor.dom,
  }
}

let scheduler = Rx.Scheduler.asap
//  (window as any).scheduler = new Rx.TestScheduler()
// scheduler.advanceTo(Date.now())
// setInterval(() => scheduler.advanceBy(200), 200)

let screens = [
  // introScreen, 
  // generalScreens,
  testScreen(scheduler),
]

if (typeof window !== "undefined") {
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
}
