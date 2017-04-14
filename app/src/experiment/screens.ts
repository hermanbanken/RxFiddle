// tslint:disable:object-literal-sort-keys
import { handleRangeTouch } from "./range"
import h from "snabbdom/h"
import { VNode } from "snabbdom/vnode"

export type Screen = {
  dom: Rx.Observable<VNode>
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
      attrs: { type: "range", min: opts.min, max: opts.max },
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
  dom: wrapWithNextButton([
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
      h("p", `This survey works best on Chrome on a laptop/desktop. Please set a reminder to take the survey later.`),
      h("p", h("a.btn", { attrs: { href: "x-apple-reminder://" } }, "Set a reminder")),
    ]),
  ], "Start survey"),
}

/* Second screen the user sees */
let general1: VNode[] = [
  h("p", `First some general questions to get an understanding 
            of your experience (without Reactive Programming).`),
  q("age", "Your age:", { max: 88, min: 18, type: "range" as "range" }),

  h("h2", "Programming in general"),
  q("years_pr", "Your years of experience with programming in general:", { max: 30, min: 0, type: "range" as "range" }),
  q("exp_pr", "Access your level of experience in programming in general:", {
    max: 8, min: 0, type: "labels" as "labels",
    labels: ["none", "beginner", "medium", "senior", "expert"],
  }),
  q("exp_pr_compared", "Compare your programming skills to your collegues. On average you are:", {
    max: 8, min: 0, type: "labels" as "labels",
    labels: ["worse", "slightly worse", "equal", "slightly better", "better"],
  }),

  h("h2", "Languages"),
  q("exp_js", "Access your level of experience in JavaScript:", {
    max: 8, min: 0, type: "labels" as "labels",
    labels: ["none", "beginner", "medium", "senior", "expert"],
  }),
  q("exp_java", "Access your level of experience in Java:", {
    max: 8, min: 0, type: "labels" as "labels",
    labels: ["none", "beginner", "medium", "senior", "expert"],
  }),
  q("exp_scala", "Access your level of experience in Scala:", {
    max: 8, min: 0, type: "labels" as "labels",
    labels: ["none", "beginner", "medium", "senior", "expert"],
  }),
  q("exp_swift", "Access your level of experience in Swift:", {
    max: 8, min: 0, type: "labels" as "labels",
    labels: ["none", "beginner", "medium", "senior", "expert"],
  }),
  q("exp_c#", "Access your level of experience in C#:", {
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
  q("exp_rp", "Access your level of experience in Reactive Programming:", {
    max: 8, min: 0, type: "labels" as "labels",
    labels: ["none", "beginner", "medium", "senior", "expert"],
  }),
  q("exp_rp_compared", "Compare your Reactive Programming skills to your collegues. On average you are:", {
    max: 8, min: 0, type: "labels" as "labels",
    labels: ["worse", "slightly worse", "equal", "slightly better", "better"],
  }),

  q("exp_rx", "Access your level of experience with ReactiveX (RxJS, RxSwift, Rx.NET, etc.):", {
    max: 8, min: 0, type: "labels" as "labels",
    labels: ["none", "beginner", "medium", "senior", "expert"],
  }),

  q("exp_reactivestreams", `Access your level of experience with 
     Reactive Streams implementations 
     (Akka Streams, Spring Project Reactor, Bacon.js, Most.js, etc.):`,
    {
      max: 8, min: 0, type: "labels" as "labels",
      labels: ["none", "beginner", "medium", "senior", "expert"],
    }),
]

export let generalScreens: Screen = {
  dom: Rx.Observable.concat(
    wrapWithNextButton(general1),
    wrapWithNextButton(general2)
  ),
}
