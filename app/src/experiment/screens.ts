// tslint:disable:object-literal-sort-keys
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
  { type: "answer", surveyId: string, path: string[] }
export type Screen = {
  render: (state: TestState) => {
    dom: Rx.Observable<VNode>
    events: Rx.Observable<TestEvent>
  }
}

class States {
  public static list() {
    let ids = JSON.parse(localStorage.getItem("surveys") || "[]")
    return ids.map((id: string) => States.get(id)) as TestState[]
  }
  public static get(id: string) {
    return (JSON.parse(localStorage.getItem(id) || "null") || [States.create(id)]) as TestState
  }
  public static create(id?: string) {
    return {
      id: id || UUID(),
      paused: true,
      active: [],
      data: {},
    } as TestState
  }
  public static save(state: TestState) {
    let list = States.list().map(_ => _.id)
    if (list.indexOf(state.id) < 0) {
      list.push(state.id)
      localStorage.setItem("surveys", JSON.stringify(list))
    }
    localStorage.setItem(state.id, JSON.stringify(state))
    localStorage.setItem("lastSurvey", state.id)
  }
}

function mkButton(text: string = "Next") {
  let subject = new Rx.Subject<boolean>()
  return {
    dom: h("a.btn", { attrs: { href: "#top" }, on: { click: () => subject.onNext(true) } }, text),
    events: subject as Rx.Observable<boolean>,
  }
}

function wrapWithNextButton(nodes: VNode[], nextText: string = "Next") {
  return Rx.Observable.create<VNode>(observer => {
    observer.onNext(h("div.flexy", h("div.scrolly.flexy", h("div.width",
      [h("div#top")].concat(nodes).concat([
        h("a.btn", { attrs: { href: "#top" }, on: { click: () => observer.onCompleted() } }, nextText),
      ])))))
  })
}

type QuestionType = "range" | "labels"
type QuestionTypeOptions =
  { type: "range", min: number, max: number } |
  { type: "labels", min: number, max: number, labels: string[] }

function q(name: string, text: string, opts: QuestionTypeOptions) {
  let nodes: VNode[] = []
  if (opts.type === "range" || opts.type === "labels") {
    nodes.push(h("input", {
      attrs: { type: "range", min: opts.min, max: opts.max, value: (opts.min + opts.max) / 2 },
      on: {
        touchstart: (e: TouchEvent) => handleRangeTouch(e),
        touchmove: (e: TouchEvent) => handleRangeTouch(e),
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

  return h("div.question", [text, ...nodes])
}

/* First screen the user sees */
export let introScreen: Screen = {
  render: (state) => {
    let buttons = [States.create(), ...States.list()].map(survey => {
      let button = mkButton(survey.started ? "Resume Survey" : "Start Survey")
      return {
        survey,
        dom: h("div", [
          button.dom,
          survey.started ? `started at ${survey.started}` : "",
        ]),
        events: button.events.map(e => ({
          type: "start",
          surveyId: survey.id,
        }) as TestEvent),
      }
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
        ...buttons.map(_ => h("div", [
          _.dom,
          _.survey.started ? `started at ${_.survey.started}` : "",
        ])),
      ])))),
      events: Rx.Observable.merge<TestEvent>(buttons.map(_ => _.events)),
    }
  },
}

/* Second screen the user sees */
let general1: VNode[] = [
  h("p", `First some general questions to get an understanding 
            of your experience (without Reactive Programming).`),
  q("age", "Your age:", { max: 88, min: 18, type: "range" as "range" }),

  h("h2", "Programming in general"),
  q("years_pr", "Your years of experience with programming in general:", { max: 30, min: 0, type: "range" as "range" }),
  q("exp_pr", "Assess your level of experience in programming in general:", {
    max: 8, min: 0, type: "labels" as "labels",
    labels: ["none", "beginner", "medium", "senior", "expert"],
  }),
  q("exp_pr_compared", "Compare your programming skills to your collegues. On average you are:", {
    max: 8, min: 0, type: "labels" as "labels",
    labels: ["worse", "slightly worse", "equal", "slightly better", "better"],
  }),

  h("h2", "Languages"),
  q("exp_js", "Assess your level of experience in JavaScript:", {
    max: 8, min: 0, type: "labels" as "labels",
    labels: ["none", "beginner", "medium", "senior", "expert"],
  }),
  q("exp_java", "Assess your level of experience in Java:", {
    max: 8, min: 0, type: "labels" as "labels",
    labels: ["none", "beginner", "medium", "senior", "expert"],
  }),
  q("exp_scala", "Assess your level of experience in Scala:", {
    max: 8, min: 0, type: "labels" as "labels",
    labels: ["none", "beginner", "medium", "senior", "expert"],
  }),
  q("exp_swift", "Assess your level of experience in Swift:", {
    max: 8, min: 0, type: "labels" as "labels",
    labels: ["none", "beginner", "medium", "senior", "expert"],
  }),
  q("exp_c#", "Assess your level of experience in C#:", {
    max: 8, min: 0, type: "labels" as "labels",
    labels: ["none", "beginner", "medium", "senior", "expert"],
  }),
]

/* Third screen the user sees */
let general2: VNode[] = [
  h("p", `Now some questions to get an understanding 
            of your experience with Reactive Programming.`),

  h("h2", "Reactive Programming"),
  q("years_rp", "Your years of experience with Reactive Programming:", { max: 10, min: 0, type: "range" as "range" }),
  q("exp_rp", "Assess your level of experience in Reactive Programming:", {
    max: 8, min: 0, type: "labels" as "labels",
    labels: ["none", "beginner", "medium", "senior", "expert"],
  }),
  q("exp_rp_compared", "Compare your Reactive Programming skills to your collegues. On average you are:", {
    max: 8, min: 0, type: "labels" as "labels",
    labels: ["worse", "slightly worse", "equal", "slightly better", "better"],
  }),

  q("exp_rx", "Assess your level of experience with ReactiveX (RxJS, RxSwift, Rx.NET, etc.):", {
    max: 8, min: 0, type: "labels" as "labels",
    labels: ["none", "beginner", "medium", "senior", "expert"],
  }),

  q("exp_reactivestreams", `Assess your level of experience with 
     Reactive Streams implementations 
     (Akka Streams, Spring Project Reactor, Bacon.js, Most.js, etc.):`,
    {
      max: 8, min: 0, type: "labels" as "labels",
      labels: ["none", "beginner", "medium", "senior", "expert"],
    }),
]

export let generalScreens: Screen = {
  render: (state) => ({
    dom: Rx.Observable.concat(
      wrapWithNextButton(general1),
      wrapWithNextButton(general2)
    ),
    events: Rx.Observable.never<TestEvent>(),
  }),
}
