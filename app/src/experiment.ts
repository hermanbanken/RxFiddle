import JsonCollector from "./collector/jsonCollector"
import RxRunner from "./collector/runner"
import CodeEditor from "./ui/codeEditor"
import { hbox, vbox } from "./ui/flex"
import Resizer from "./ui/resizer"
import { LanguageMenu, Query, errorHandler, shareButton } from "./ui/shared"
import Splash from "./ui/splash"
import Visualizer, { DataSource } from "./visualization"
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
        nodes.push(h("input", { attrs: { type: "range", min: opts.min, max: opts.max } }))
    }
    if (opts.type === "labels") {
        let l = opts.labels.length
        let m = ((1 + 1 / l) * (1 + 1 / l) - 1 / l - 1) / 2
        nodes.push(h("div.labels", {
            // style: { margin: `0 ${-m * 100}%` },
        }, opts.labels.map(l => h("span.label", l))))
    } else {
        let l = 10
        let m = ((1 + 1 / (l + 1)) * (1 + 1 / (l + 1)) - 1 / (l + 1) - 1) / 2
        let labels = []
        for (let i = 0; i <= l; i++) {
            labels.push(h("span.label", `${opts.min + i * (opts.max - opts.min) / l}${i === l ? "+" : ""}`))
        }
        nodes.push(h("div.labels", {
            // style: { margin: `0 ${-m * 100}%` }
        }, labels))
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
patch(generalVN, h("div#general.page", general))

let part1: VNode[] = [

]

Rx.Observable.fromEvent<MouseEvent>(document.body as any, "touchDown").map((e: MouseEvent) => {
    let target = e.target as HTMLElement
    if (target.tagName === "INPUT" && (target as any).type === "range") {
        alert(JSON.stringify(e))
    }
})
