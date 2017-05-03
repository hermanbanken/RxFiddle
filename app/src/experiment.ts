// tslint:disable:ob§ect-literal-sort-keys
// tslint:disable:max-line-length
import AnalyticsObserver from "./analytics"
import RxRunner, { Runner } from "./collector/runner"
import ConsoleRunner from "./experiment/console-runner"
import ConsoleVisualizer from "./experiment/console-visualizer"
import overlay from "./experiment/overlay"
import samples, { Sample } from "./experiment/samples"
import { Screen, States, SurveyState, TestEvent, TestState, general, generalLangs, generalRpExperience, introScreen, previous } from "./experiment/screens"
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
import { RxJS4 } from "./languages"
import { personal, signin, user } from "./firebase"
import { database } from "firebase"
import debug from "./rx-operator-debug"

function asObject(map: Map<string, any>): any {
  let o = {} as any
  for (let kv of map) {
    o[kv[0]] = kv[1]
  }
  return o
}

// for experiment:
// load samples, concat them
// create timer
// track answers, if ok continue, else note, timeout hint, timeout again pass
//
// other:
// track all events

let initialSurveyState: SurveyState = {
  surveys: [],
  loading: true
}

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

let inputData = personal("surveys")

function handleTestEvent(state: SurveyState, event: TestEvent, data: database.DataSnapshot): void {
  // console.log("handle", event, state, state.surveys.find(s => s.id === state.active))
  if (typeof event === "undefined") {
    return
  }
  if (event.type === "start") {
    let survey = (state.surveys.find(s => s.id === event.surveyId) || {} as TestState)
    let uuid = survey.reference || UUID()
    let mode = survey.mode || Math.random() > .5 ? "rxfiddle" : "console"
    data.ref.update(asObject(new Map<string, any>([
      ["active", event.surveyId],
      [`${event.surveyId}/id`, event.surveyId],
      [`${event.surveyId}/paused`, false],
      [`${event.surveyId}/started`, new Date()],
      [`${event.surveyId}/reference`, uuid],
      [`${event.surveyId}/mode`, mode],
    ])))
  }
  if (event.type === "answer") {
    let test = state.surveys.find(s => s.id === state.active)
    let existing = (test.data || {})[event.path[0]] || {}
    let update = new Map<string, any>([
      [`${test.id}/data/${event.path[0]}`, typeof event.value === "object" ? Object.assign({}, existing, event.value) : event.value],
    ])
    // console.log(update)
    data.ref.update(asObject(update))
  }
  if (event.type === "goto") {
    data.ref.update(asObject(new Map<string, any>([
      [`${event.surveyId}/active`, event.path],
    ])))
  }
  if (event.type === "pause") {
    data.ref.child("active").remove()
  }
  if (event.type === "pass") {
    let test = state.surveys.find(s => s.id === state.active)
    data.ref.update(asObject(new Map<string, any>([
      [`${test.id}/data/${event.question}/passed`, true],
    ])))
  }
  if (event.type === "reference") {
    let test = state.surveys.find(s => s.id === state.active)
    let map = new Map<string, any>([
      [`${test.id}/reference`, event.ref],
    ])
    if (!isNaN(event.ref as any)) {
      map.set(`${test.id}/mode`, parseInt(event.ref, 10) % 2 === 0 ? "rxfiddle" : "console")
    }
    data.ref.update(asObject(map))
  }

  if (event.type === "tick") {
    //// TODO log passing of time
    // let test = state.surveys.find(s => s.id === state.active)
    // data.ref.child(`${test.id}/data/${event.question}/ticks`).ref
    // data.ref.update(asObject(new Map<string, any>([
    //   [`${test.id}/data/${event.question}/ticks`, true],
    // ])))
  }
}

function snapshotToState(snapshot: firebase.database.DataSnapshot): { surveys: SurveyState, state: TestState } {
  let val = snapshot.val()
  let active: string = val && val.active
  let initialSurveys = Object.assign({}, initialSurveyState, { loading: false })
  let surveys: TestState[] = val && Object.keys(val).filter(k => typeof val[k] === "object").map(k => val[k])
  if (!surveys) {
    return {
      surveys: initialSurveys,
      state: undefined,
    }
  } else if (!active) {
    return { state: undefined, surveys: { active, surveys } }
  } else {
    return {
      state: surveys.find(s => s.id === active) || initialTestState,
      surveys: { active, surveys } || initialSurveys,
    }
  }
}

let dispatcher: (event: TestEvent) => void = null
let dispatchObservable = new Rx.Observable<TestEvent>(observer => {
  dispatcher = (e) => {
    observer.next(e)
    if (e.type !== "tick") {
      AnalyticsObserver.next(e)
    }
  }
})

let testLoop = inputData
  .switchMap((snapshot: firebase.database.DataSnapshot) => {
    return dispatchObservable
      .map(event => ({ event, snapshot: undefined }))
      .do(d => handleTestEvent(snapshotToState(snapshot).surveys, d.event, snapshot))
      .startWith({ snapshot, event: undefined })
  })
  .filter(input => "snapshot" in input && input.snapshot)
  .map(({ snapshot }) => snapshotToState(snapshot))
  .startWith({ state: undefined, surveys: initialSurveyState })
  .map(({ state, surveys }) => {
    let screen: Screen
    let screens = [introScreen, general, generalLangs, generalRpExperience, testScreen(Rx.Scheduler.async), doneScreen]
    if (!state || !surveys.active) {
      screen = introScreen
    } else {
      screen = screens.find(s => s.isActive(state))
    }
    if (!screen) {
      return Rx.Observable.never()
    }

    let { dom } = screen.render(state, e => dispatcher(e), surveys, screens)

    if (!screen.hasMenu) {
      return dom.map(nodes => h("div.tool.flexy.flexy-v.rel", [
        h("div#menufold-static.menufold", [
          h("a.brand.left", {
            attrs: { href: "#" },
            on: { click: () => dispatcher({ type: "pause" }) },
          }, [
              h("img", { attrs: { alt: "ReactiveX", src: "images/RxIconXs.png" } }),
              "RxFiddle" as any as VNode,
            ]),
          h("div", { style: { flex: "1" } }),
          h("div.right", [
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

function formatQuestion(state: TestState, sample: Sample, time: Rx.Observable<number>, dispatch: (event: TestEvent) => void, screens: Screen[], current: Screen): Rx.Observable<VNode> {
  return sample.renderQuestion(state, dispatch).flatMap(render =>
    time.map(t => h("div.question-bar", h("div.question-wrapper", {
      key: sample.id.toString(), style: {
        "margin-top": "-100%",
        delayed: { "margin-top": "0%" },
        remove: { "margin-top": "-100%" },
      },
    }, [
        h("div.countdown.right", [
          formatSeconds((sample.timeout || 600) - t),
        ]),
        h("h1", "Question"),
        h("form.q", {
          on: {
            submit: (e: any) => {
              if (sample.handleSubmit) {
                sample.handleSubmit(state, dispatch, e.target.elements)
              }
              e.preventDefault()
              return false
            },
          },
        }, [
            render,
            h("div.buttons", { style: { "margin-top": "10px", "margin-bottom": "0" } }, [
              h("a.btn.inverse", { attrs: { role: "button" }, on: { click: () => previous(screens, current).goto(state, dispatch) }, style: { "margin-right": "5px" } }, "Back"),
              h("a.btn.inverse", { attrs: { role: "button" }, on: { click: () => dispatch({ type: "pause" }) }, style: { "margin-right": "5px" } }, "Pause"),
              h("a.btn.inverse", {
                attrs: { role: "button", title: "Skip to next question" },
                on: { click: () => confirm("Are you sure you to pass on this question?") && dispatcher({ question: sample.id, type: "pass" }) },
                style: { "margin-right": "5px" },
              }, "Pass"),
              h("input.btn.inverse", { attrs: { type: "submit" } }, "Submit"),
            ]),
          ]),
      ]))
    ))
}

let doneScreen: Screen = {
  goto: () => { },
  isActive: (state) => true,
  progress: () => ({ max: 0, done: 0 }),
  render: (state, dispatcher) => ({
    dom: Rx.Observable.of(h("div.flexy", h("div.scrolly.flexy", h("div.width", [
      h("h2", "Done"),
      h("p", "Thank you very much for filling in this survey."),
      h("p", [
        "RxFiddle is live at ",
        h("a", { attrs: { href: "http://rxfiddle.net" } }, "rxfiddle.net"),
        ". If you like this survey or RxFiddle please Star ",
        h("a", { attrs: { href: "https://github.com/hermanbanken/RxFiddle" } }, "the project on Github"),
        ". For any issues you can make an Issue on the Github page.",
      ]),
      h("a.btn", {
        on: { click: () => dispatcher({ type: "pause" }) },
      }, "Back"),
      h("p", "Your data (sorry, no neat view yet):"),
      h("pre", JSON.stringify(state, null, 2)),
    ])))),
  }),
}

let useRxFiddle = true

/* Screen containing RxFiddle */
let testScreen = (scheduler: IScheduler): Screen => ({
  goto(state, dispatch) { dispatch({ path: ["test"], surveyId: state.id, type: "goto" }) },
  isActive(state) {
    return !state.active ||
      state.active[0] === "test" &&
      samples.some((s, index) => !state.data || !state.data[s.id] || !(state.data[s.id].passed || state.data[s.id].completed))
  },
  progress() { return { max: 0, done: 0 } },
  hasMenu: true,
  render(state, dispatch, _, screens) {
    return {
      dom: Rx.Observable.defer(() => {
        let index = samples.findIndex((s, index) => !state.data || !state.data[s.id] || !(state.data[s.id].passed || state.data[s.id].completed))
        let sample = samples[index]
        let collector = DataSource(state, sample)

        let question = Rx.Observable.interval(1000, scheduler)
          .startWith(0)
          .take(sample.timeout)
          .let(time => formatQuestion(state, sample, time, dispatch, screens, this))

        let active = Rx.Observable
          .defer(() => {
            if (state.mode === "rxfiddle") {
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
                h("a.brand.left", {
                  attrs: { href: "#" },
                  on: { click: () => dispatch({ type: "pause" }) },
                }, [
                    h("img", { attrs: { alt: "ReactiveX", src: "images/RxIconXs.png" } }),
                    "RxFiddle" as any as VNode,
                  ]),
                menu(collector.runner, collector.editor),
                h("div", { style: { flex: "1" } }),
                h("div.right", [
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
          .let(time => formatQuestion(state, sample, time, dispatch, screens, this))
          .map((render) => [
            render,
            h("div.center", h("div", { style: { padding: "3em" } }, [
              h("h2", "time's up"),
              h("p.gray", { style: { width: "21em", "margin-left": "auto", "margin-right": "auto", color: "gray" } },
                `No problem, just continue with the next question.`),
              h("a.btn", { on: { click: () => dispatch({ type: "pass", question: sample.id }) } }, "Continue with next question"),
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
    }
  },
})

function DataSource(state: TestState, sample: Sample) {
  let editor = new CodeEditor(sample.code.trim(), sample.codeRanges && sample.codeRanges(), sample.lineClasses && sample.lineClasses())
  let editedCode = Rx.Observable.fromEventPattern<string>(h => editor.withValue(h as any), h => void (0))
  let runner: Runner
  if (state.mode === "rxfiddle") {
    runner = new RxRunner(RxJS4.runnerConfig, editedCode.map(c => sample.renderCode ? sample.renderCode(c) : c), AnalyticsObserver)
  } else {
    let config = { libraryFile: RxJS4.runnerConfig.libraryFile, workerFile: "dist/worker-console-experiment.bundle.js" }
    runner = new ConsoleRunner(config, editedCode.map(c => sample.renderCode ? sample.renderCode(c) : c), AnalyticsObserver)
  }
  return {
    data: runner,
    runner,
    editor,
    vnode: editor.dom,
  }
}

if (typeof window !== "undefined") {
  let mainVN = document.querySelector("#experiment") as VNode | HTMLBodyElement
  testLoop
    .subscribe(vnode => {
      mainVN = patch(mainVN, h("div#screens", vnode))
    }, e => console.warn(e))
}
