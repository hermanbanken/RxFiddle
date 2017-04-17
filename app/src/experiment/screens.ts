// tslint:disable:object-literal-sort-keys
// tslint:disable:variable-name
import { UUID } from "../utils"
import { handleRangeTouch } from "./range"
import h from "snabbdom/h"
import { VNode } from "snabbdom/vnode"

export type TestState = {
  id: string
  paused: boolean
  started?: Date
  active: string[]
  data: { [testId: string]: any }
}

export type TestEvent =
  { type: "start", surveyId: string } |
  { type: "answer", surveyId: string, path: string[], value: any } |
  { type: "goto", surveyId: string, path: string[] } |
  { type: "next", surveyId: string, fromActive: string[] } |
  { type: "pause" } |
  { type: "pass", question: number }

export type Progress = {
  max: number
  done: number
}

export type Dispatcher = (event: TestEvent) => void

export type Screen = {
  isActive: (state: TestState) => boolean
  progress: (state: TestState) => Progress
  render: (state: TestState, dispatcher: Dispatcher) => {
    dom: Rx.Observable<VNode>
  },
  hasMenu?: boolean
}

export class State {
  public list() {
    let ids = JSON.parse(localStorage.getItem("surveys") || "[]")
    return ids.map((id: string) => this.get(id)) as TestState[]
  }
  public get(id: string) {
    return (JSON.parse(localStorage.getItem(id) || "null") || this.create(id)) as TestState
  }
  public create(id?: string) {
    return {
      id: id || UUID(),
      paused: true,
      active: [],
      data: {},
    } as TestState
  }
  public save(state: TestState) {
    let list = this.list().map(_ => _.id)
    if (list.indexOf(state.id) < 0) {
      list.push(state.id)
      localStorage.setItem("surveys", JSON.stringify(list))
    }
    localStorage.setItem(state.id, JSON.stringify(state))
    localStorage.setItem("lastSurvey", state.id)
  }
}

export let States = new State()

function mkButton(text: string = "Next", callback: () => void) {
  return h("a.btn", { attrs: { href: "#top" }, on: { click: callback } }, text)
}

type QuestionType = "range" | "labels"
type QuestionTypeOptions =
  { type: "range", min: number, max: number } |
  { type: "labels", min: number, max: number, labels: string[] }

function mkq(name: string, text: string, opts: QuestionTypeOptions, state: TestState, dispatcher: Dispatcher) {
  let nodes: VNode[] = []
  if (opts.type === "range" || opts.type === "labels") {
    let value = state && typeof state.data[name] === "number" && state.data[name] || opts.min
    let handler = (e: Event) => dispatcher({
      type: "answer", surveyId: state.id, path: [name],
      value: (e.target as HTMLInputElement).value,
    })
    nodes.push(h("input", {
      attrs: { type: "range", min: opts.min, max: opts.max, value },
      on: {
        touchstart: (e: TouchEvent) => handleRangeTouch(e),
        touchmove: (e: TouchEvent) => handleRangeTouch(e),
        click: handler,
        change: handler,
      },
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

  return {
    dom: h("div.question", [text, ...nodes]),
  }
}

function formatDate(date: Date) {
  if (typeof date === "string") {
    return new Date(date).toLocaleString()
  } else {
    return date.toLocaleString()
  }
}

/* First screen the user sees */
export let introScreen: Screen = {
  isActive: (state) => state.paused,
  progress: (state) => ({ max: 2, done: state.paused ? 0 : 2 }),
  render: (state, dispatcher) => {
    let buttons = States.list()
      .concat(States.list().some(s => !s.started) ? [] : [States.create()])
      .map(survey => {
        let button = mkButton(survey.started ?
          "Resume survey" :
          (States.list().length ? "Start new survey entry" : "Start survey"),
          () => dispatcher({
            type: "start",
            surveyId: survey.id,
          }))
        return h("div.mb", [
          button,
          h("span.gray", survey.started ? ` started at ${formatDate(survey.started)}` : ""),
        ])
      })
    return {
      dom: Rx.Observable.just(h("div.flexy", h("div.scrolly.flexy", h("div.width", [
        h("h1", "Survey on Reactive Programming"),
        h("p", `This is a survey to test Reactive Program comprehension and debugability.
                Please take part, even if you have little experience with Reactive Programming.`),
        h("ul", [
          h("li", `What's in it for you: learn a new way of debugging Reactive Programs!`),
          h("li", `What's in it for me: you help me graduate!`),
          h("li", `Estimated time required: 60 minutes`),
          h("li", `Used Reactive Programming implementation: RxJS 4.1`),
        ]),
        h("div.mobile-only", [
          h("p", `This survey works best on Chrome on a laptop/desktop. 
                  Please set a reminder to take the survey later.`),
          h("p", h("a.btn", { attrs: { href: "x-apple-reminder://" } }, "Set a reminder")),
        ]),
        ...buttons,
      ])))),
    }
  },
}

/* Second screen the user sees */
export let general: Screen = {
  isActive: (state) => !state || !state.active || !state.active.length || state.active[0] === "general",
  progress: () => ({ max: 0, done: 0 }),
  render: (state, dispatcher) => {
    let age = mkq("age", "Your age:", { max: 88, min: 18, type: "range" as "range" }, state, dispatcher)
    let years_pr = mkq("years_pr", "Your years of experience with programming in general:", {
      max: 30, min: 0, type: "range" as "range",
    }, state, dispatcher)
    let exp_pr = mkq("exp_pr", "Assess your level of experience in programming in general:", {
      max: 8, min: 0, type: "labels" as "labels",
      labels: ["none", "beginner", "medium", "senior", "expert"],
    }, state, dispatcher)
    let exp_pr_compared =
      mkq("exp_pr_compared", "Compare your programming skills to your collegues. On average you are:", {
        max: 8, min: 0, type: "labels" as "labels",
        labels: ["worse", "slightly worse", "equal", "slightly better", "better"],
      }, state, dispatcher)

    let button = mkButton("Next", () => dispatcher({ type: "goto", surveyId: state.id, path: ["general_langs"] }))

    return {
      dom: Rx.Observable.just(h("div.flexy", h("div.scrolly.flexy", h("div.width", [
        h("p", `First some general questions to get an understanding
            of your experience (without Reactive Programming).`),
        age.dom,
        h("h2", "Programming in general"),
        years_pr.dom,
        exp_pr.dom,
        exp_pr_compared.dom,
        button,
      ])))),
    }
  },
}

/* Second screen the user sees */
export let generalLangs: Screen = {
  isActive: (state) => !state.active || state.active[0] === "general_langs",
  progress: () => ({ max: 0, done: 0 }),
  render: (state, dispatcher) => {
    let exp_js = mkq("exp_lang_js", "Assess your level of experience in JavaScript:", {
      max: 8, min: 0, type: "labels" as "labels",
      labels: ["none", "beginner", "medium", "senior", "expert"],
    }, state, dispatcher)
    let exp_java = mkq("exp_lang_java", "Assess your level of experience in Java:", {
      max: 8, min: 0, type: "labels" as "labels",
      labels: ["none", "beginner", "medium", "senior", "expert"],
    }, state, dispatcher)
    let exp_scala = mkq("exp_lang_scala", "Assess your level of experience in Scala:", {
      max: 8, min: 0, type: "labels" as "labels",
      labels: ["none", "beginner", "medium", "senior", "expert"],
    }, state, dispatcher)
    let exp_swift = mkq("exp_lang_swift", "Assess your level of experience in Swift:", {
      max: 8, min: 0, type: "labels" as "labels",
      labels: ["none", "beginner", "medium", "senior", "expert"],
    }, state, dispatcher)
    let exp_cs = mkq("exp_lang_cs", "Assess your level of experience in C#:", {
      max: 8, min: 0, type: "labels" as "labels",
      labels: ["none", "beginner", "medium", "senior", "expert"],
    }, state, dispatcher)

    let button = mkButton("Next", () => dispatcher({ type: "goto", surveyId: state.id, path: ["general_rp"] }))

    return {
      dom: Rx.Observable.just(h("div.flexy", h("div.scrolly.flexy", h("div.width", [
        h("p", `First some general questions to get an understanding
            of your experience (without Reactive Programming).`),
        h("h2", "Languages"),
        exp_js.dom,
        exp_java.dom,
        exp_scala.dom,
        exp_swift.dom,
        exp_cs.dom,
        button,
      ])))),
    }
  },
}

/* Thirds screen the user sees */
export let generalRpExperience: Screen = {
  isActive: (state) => state.active[0] === "general_rp",
  progress: () => ({ max: 0, done: 0 }),
  render: (state, dispatcher) => {
    let years_rp = mkq("years_rp", "Your years of experience with Reactive Programming:",
      { max: 10, min: 0, type: "range" as "range" }, state, dispatcher)
    let exp_rp = mkq("exp_rp", "Assess your level of experience in Reactive Programming:", {
      max: 8, min: 0, type: "labels" as "labels",
      labels: ["none", "beginner", "medium", "senior", "expert"],
    }, state, dispatcher)
    let exp_rp_compared = mkq("exp_rp_compared",
      "Compare your Reactive Programming skills to your collegues. On average you are:", {
        max: 8, min: 0, type: "labels" as "labels",
        labels: ["worse", "slightly worse", "equal", "slightly better", "better"],
      }, state, dispatcher)
    let exp_rx = mkq("exp_rx", "Assess your level of experience with ReactiveX (RxJS, RxSwift, Rx.NET, etc.):", {
      max: 8, min: 0, type: "labels" as "labels",
      labels: ["none", "beginner", "medium", "senior", "expert"],
    }, state, dispatcher)
    let exp_reactivestreams = mkq("exp_reactivestreams", `Assess your level of experience with 
     other Reactive Programming implementations 
     (Akka Streams, Spring Project Reactor, Most.js, etc.):`,
      {
        max: 8, min: 0, type: "labels" as "labels",
        labels: ["none", "beginner", "medium", "senior", "expert"],
      }, state, dispatcher)

    let button = mkButton("Next", () => dispatcher({ type: "goto", surveyId: state.id, path: ["test"] }))

    return {
      dom: Rx.Observable.just(h("div.flexy", h("div.scrolly.flexy", h("div.width", [
        h("p", `Now some questions to get an understanding 
                of your experience with Reactive Programming.`),
        h("h2", "Reactive Programming"),
        years_rp.dom,
        exp_rp.dom,
        exp_rp_compared.dom,
        exp_rx.dom,
        exp_reactivestreams.dom,
        button,
      ])))),
    }
  },
}
