// tslint:disable:object-literal-sort-keys
// tslint:disable:max-line-length
import AnalyticsObserver from "./analytics"
import RxRunner, { Runner } from "./collector/runner"
import ConsoleRunner from "./experiment/console-runner"
import ConsoleVisualizer from "./experiment/console-visualizer"
import overlay from "./experiment/overlay"
import samples, { Sample } from "./experiment/samples"
import { Screen, States, SurveyState, TestEvent, TestState, doneScreen, general, generalLangs, generalRpExperience, introScreen } from "./experiment/screens"
import { testScreen, rightMenuLinks, menu } from "./experiment/testScreen"
import { formatSeconds } from "./experiment/utils"
import { personal, signin, uid } from "./firebase"
import { RxJS4 } from "./languages"
import patch from "./patch"
import "./prelude"
import CodeEditor from "./ui/codeEditor"
import { hboxo, vboxo } from "./ui/flex"
import Resizer from "./ui/resizer"
import { Query, errorHandler } from "./ui/shared"
import { UUID } from "./utils"
import RxFiddleVisualizer from "./visualization"
import Grapher from "./visualization/grapher"
import { database } from "firebase"
import * as Rx from "rxjs"
import { IScheduler } from "rxjs/Scheduler"
import h from "snabbdom/h"
import { VNode } from "snabbdom/vnode"

signin().subscribe()

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

function screenNavigation(path: string[], direction: 1 | -1) {
  path = path || []
  let index = screens.findIndex(s => s.path.length === path.length && s.path.every((p, i) => p === path[i]))
  if (index < 0) {
    index = screens.findIndex(s => s.path[0] === path[0])
  }
  if (index + direction < 0 || index + direction >= screens.length) {
    return path
  }
  return screens[index + direction].path
}

let inputData = uid().switchMap(u => u === null ? Rx.Observable.empty<database.DataSnapshot>() : personal("surveys"))

function handleTestEvent(state: SurveyState, event: TestEvent, data: database.DataSnapshot): void {
  // console.log("handle", event, state, state.surveys.find(s => s.id === state.active))
  if (typeof event === "undefined") {
    return
  }
  if (event.type === "start") {
    let survey = (state.surveys.find(s => s.id === event.surveyId) || {} as TestState)
    let uuid = survey.reference || UUID()
    let mode = survey.mode || Math.random() > .5 ? "rxfiddle" : "console"
    let isPaused = survey.active ? survey.active[0] === "pause" : false
    data.ref.update(asObject(new Map<string, any>([
      ["active", event.surveyId],
      [`${event.surveyId}/id`, event.surveyId],
      [`${event.surveyId}/paused`, false],
      [`${event.surveyId}/started`, new Date()],
      [`${event.surveyId}/reference`, uuid],
      [`${event.surveyId}/mode`, mode],
      [`${event.surveyId}/active`, isPaused ? screenNavigation(["pause"], 1) : survey.active || screens[1].path],
    ])))
  }
  if (event.type === "answer") {
    let test = state.surveys.find(s => s.id === state.active)
    let existing = (test.data || {})[event.path[0]] || {}
    let update = new Map<string, any>([
      [`${test.id}/data/${event.path[0]}`, typeof event.value === "object" ? Object.assign({}, existing, event.value) : event.value],
    ])
    if (event.value.completed) {
      update.set(`${test.id}/active`, screenNavigation(test.active, 1))
    }
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
  if (event.type === "back") {
    let test = state.surveys.find(s => s.id === state.active)
    data.ref.update(asObject(new Map<string, any>([
      [`${test.id}/active`, screenNavigation(test.active, -1)],
    ])))
  }
  if (event.type === "pass") {
    let test = state.surveys.find(s => s.id === state.active)
    data.ref.update(asObject(new Map<string, any>([
      [`${test.id}/active`, screenNavigation(test.active, 1)],
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
  let initialSurveys = Object.assign({}, initialSurveyState)
  initialSurveys.loading = false
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

const screens = [introScreen, general, generalLangs, generalRpExperience, ...samples.map(sample => testScreen(sample, Rx.Scheduler.async)), doneScreen]

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
          h("a.brand.left.flex-static", {
            attrs: { href: "#" },
            on: { click: () => dispatcher({ type: "pause" }) },
          }, [
              h("img", { attrs: { alt: "ReactiveX", src: "images/RxIconXs.png" } }),
              "RxFiddle" as any as VNode,
            ]),
          h("div.flex-fill"),
          h("div.flex-end", [
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

if (typeof window !== "undefined") {
  let mainVN = document.querySelector("#experiment") as VNode | HTMLBodyElement
  testLoop
    .subscribe(vnode => {
      mainVN = patch(mainVN, h("div#screens", vnode))
    }, e => console.warn(e))
}
