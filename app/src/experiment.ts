// tslint:disable:object-literal-sort-keys
// tslint:disable:max-line-length
import RxRunner from "./collector/runner"
import overlay from "./experiment/overlay"
import samples, { Sample } from "./experiment/samples"
import { Screen, TestEvent, TestState, generalScreens, introScreen } from "./experiment/screens"
import { formatSeconds } from "./experiment/utils"
import patch from "./patch"
import CodeEditor from "./ui/codeEditor"
import { hbox, vbox, vboxo } from "./ui/flex"
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

let testEvents = new Rx.Subject<TestEvent>()
let testLoop = testEvents
  .scan<TestState>((state, event) => {
    if (event.type === "start") {
      return Object.assign({}, state, { id: event.surveyId, paused: false })
    }
    return state
  }, initialTestState)
  .startWith(initialTestState)
  .do(console.log)
  .map(state => {
    let screen: Screen
    if (state.paused) {
      screen = introScreen
    } else {
      screen = generalScreens
    }
    let { events, dom } = screen.render(state)
    let forwardEvents = Rx.Observable.create(o => events.subscribe(testEvents))
    return dom.merge(forwardEvents)
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

function formatQuestion(sample: Sample, button: Rx.Observable<VNode>, time: Rx.Observable<number>): Rx.Observable<VNode> {
  return sample.renderQuestion.combineLatest(button, (render, btn) => ({ render, btn })).flatMap(combi =>
    time.map(t => h("div.question-bar", [
      h("div.countdown.right", [
        combi.btn, formatSeconds((sample.timeout || 600) - t)
      ]),
      h("h1", "Question"),
      combi.render,
    ]))
  )
}

/* Screen containing RxFiddle */
let testScreen = (scheduler: Rx.IScheduler): Screen => ({
  render: () => ({
    dom: Rx.Observable.from(samples).concatMap(sample => Rx.Observable.defer(() => {
      let collector = DataSource(sample.code)

      let next = Rx.Observable.create<VNode>(observer => {
        observer.onNext(h("button", { on: { click: () => observer.onCompleted() } }, "Continue with next question"))
      }).shareReplay(1)

      let pass = Rx.Observable.create<VNode>(observer => {
        observer.onNext(h("button", { on: { click: () => confirm("Are you sure you to pass on this question?") && observer.onCompleted() } }, "Pass"))
      }).shareReplay(1)

      let question = Rx.Observable.interval(1000, scheduler).take(sample.timeout)
        .let(time => formatQuestion(sample, pass, time))

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
        (visualizer, questiondom, input, state) => [
          h("div#menufold-static.menufold", [
            h("a.brand.left", { attrs: { href: "#" } }, [
              h("img", { attrs: { alt: "ReactiveX", src: "RxIconXs.png" } }),
            ]),
            menu(collector.runner, collector.editor),
            h("div", { style: { flex: "1" } }),
            h("div.right", [
              h("button.btn", "JavaScript cheatsheet"),
              h("button.btn", "RxJS docs"),
              h("button.btn.helpbutton", "Help"),
              overlay(),
            ]),
          ]),
          questiondom,
          hbox(Resizer.h(
            "rxfiddle/editor+rxfiddle/inspector",
            input,
            vboxo({ class: "viewer-panel" }, visualizer.dom)
          )),
        ])

      let outOfTime: Rx.Observable<VNode[]> = Rx.Observable.just(sample.timeout)
        .let(time => formatQuestion(sample, pass, time))
        .takeUntil(next)
        .combineLatest(next, (render, nextButton) => [
          render,
          h("div.center", h("div", { style: { padding: "3em" } }, [
            h("h2", "time's up"),
            nextButton,
            h("p.gray", { style: { width: "21em", "margin-left": "auto", "margin-right": "auto", color: "gray" } },
              `Don't worry. After the survey, you may spend all the time you
               want in this tool. Your questions, your code and your answers
               will be available at the end of the survey, if you wish.`),
          ])),
        ])

      return Rx.Observable.of(active)
        .merge(Rx.Observable.timer(1000 * sample.timeout, scheduler).map(_ => outOfTime))
        .switch()
        .takeUntil(pass.last())
        .map(nodes => h("div.tool.flexy.flexy-v.rel", nodes))
    })),
    events: Rx.Observable.never<TestEvent>(),
  }),
})

function DataSource(code: string) {
  let editor = new CodeEditor(code.trim())
  let editedCode = Rx.Observable.fromEventPattern<string>(h => editor.withValue(h as any), h => void (0))
  let runner = new RxRunner(editedCode)
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

let mainVN = document.querySelector("#screens") as VNode | HTMLBodyElement
// Rx.Observable
// .of(...screens)
// .concatMap(_ => _.dom)
// .subscribe(vnode => {
//   mainVN = patch(mainVN, h("div#screens", [vnode]))
// })

testLoop
  .subscribe(vnode => {
    mainVN = patch(mainVN, h("div#screens", [vnode]))
  })
