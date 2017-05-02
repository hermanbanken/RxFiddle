import { LineClasses, Ranges } from "../ui/codeEditor"
import { TestEvent, TestState } from "./screens"
import * as Rx from "rxjs"
import h from "snabbdom/h"
import { VNode } from "snabbdom/vnode"
import { elvis } from "../collector/collector"

export type Sample = {
  code: string,
  question: VNode | string,
  timeout: number,
  renderQuestion(state: TestState, dispatcher: (event: TestEvent) => void): Rx.Observable<VNode>
  renderCode?(input?: string): { chunks: string[] }
  codeRanges?(): Ranges
  lineClasses?(): LineClasses
}

export type CodeChunk = { run: string, visual: string } | string
export type Code = string | CodeChunk[]

export type SampleData<T> = {
  code: Code,
  question: string,
  checker: (answers: T) => boolean,
  timeout: number,
  answers?: T
}

class DefaultSample<T> implements Sample {
  public get code() {
    return typeof this.data.code === "string" ?
      this.data.code :
      this.data.code
        .map(_ => typeof _ === "object" ? _.visual : _)
        .join("\n")
  }
  public get question() { return this.data.question }
  public get timeout() { return this.data.timeout }
  protected data: SampleData<T>
  constructor(data: SampleData<T>) {
    this.data = data
  }
  public renderQuestion(state: TestState, dispatcher: (event: TestEvent) => void): Rx.Observable<VNode> {
    return Rx.Observable.of(h("div.q", this.question))
  }
}

class BmiSample<T> extends DefaultSample<T> {
  constructor(data: SampleData<T>) {
    super(data)
  }

  public renderQuestion(state: TestState, dispatcher: (event: TestEvent) => void): Rx.Observable<VNode> {
    return Rx.Observable.of(h("form.q", {
      on: {
        submit: (e: any) => {
          dispatcher({
            path: ["sample_bmi"],
            type: "answer",
            value: {
              count: parseInt(e.target.elements.count.value, 10) || null,
              last: parseFloat(e.target.elements.last.value) || null,
            },
          })
          e.preventDefault()
          return false
        },
      },
    }, [
        h("div.control", [
          h("label", `How many BMI values are logged?`),
          h("input", {
            attrs: {
              name: "count", placeholder: "enter a number", type: "number",
              value: elvis(state, ["data", "sample_bmi", "count"])[0],
            },
          }),
        ]),
        h("div.control", [
          h("label", `What is the last value logged?`),
          h("input", {
            attrs: {
              name: "last",
              placeholder: "enter nearest integer BMI value",
              step: "any", type: "number",
              value: elvis(state, ["data", "sample_bmi", "last"])[0],
            }
          }),
        ]),
        h("input.btn.inverse", { attrs: { type: "submit" } }, "Submit"),
      ]))
  }
}

class AdvancedSample<T> extends DefaultSample<T> {
  public get code() {
    if (typeof this.data.code === "string") {
      return this.data.code
    }
    return this.data.code.map(chunk =>
      typeof chunk === "string" ?
        chunk :
        chunk.visual
    ).join("\n")
  }
  public get question() { return this.data.question }
  public get timeout() { return this.data.timeout }
  constructor(data: SampleData<T>) {
    super(data)
    if (typeof this.data.code === "string") {
      this.data.code = trim(this.data.code, 1)
    } else {
      this.data.code = this.data.code.map(chunk => {
        if (typeof chunk === "string") {
          return trim(chunk, 1)
        } else {
          return { run: trim(chunk.run, 1), visual: trim(chunk.visual, 1) }
        }
      })
    }
  }
  public renderQuestion(state: TestState, dispatcher: (event: TestEvent) => void): Rx.Observable<VNode> {
    return Rx.Observable.of(h("div.q", this.question))
  }

  public normalize(input?: string): { run: string, visual: string }[] {
    if (typeof this.data.code === "string") {
      if (typeof input === "undefined") {
        return [{ run: this.data.code, visual: this.data.code }]
      } else {
        return [{ run: input, visual: input }]
      }
    }
    if (typeof input === "undefined") {
      return this.data.code.map(c => typeof c === "string" ? { run: c, visual: c } : c)
    }
    let chunks = this.data.code.reduce((code, chunk) => {
      if (typeof chunk === "string" || !code[code.length - 1]) {
        return code
      } else {
        let last = code[code.length - 1]
        let [pre, post] = last.split(chunk.visual, 2)
        return [...code.slice(0, code.length - 2), pre, chunk as any as string, post]
      }
    }, [input])
    console.log("Normalized", chunks)
    return chunks.map(c => typeof c === "string" ? { run: c, visual: c } : c)
  }

  public codeRanges(): Ranges {
    if (typeof this.data.code === "string") { return [] }
    let options = this.data.code.map(chunk => typeof chunk === "string" ? undefined : {
      atomic: true,
      className: "readonly",
      inclusiveLeft: true,
      inclusiveRight: true,
      readOnly: true,
    })
    return this.data.code.reduce((start, chunk, index) => {
      let lines = (typeof chunk === "string" ? chunk : chunk.visual).split("\n")
      return {
        line: start.line + lines.length, ranges: [...start.ranges, {
          from: { ch: 0, line: start.line },
          options: options[index],
          to: { ch: 0, line: start.line + lines.length },
        }],
      }
    }, { line: 0, ranges: [] }).ranges
  }

  public lineClasses(): LineClasses {
    console.log(this.normalize())
    return this.normalize().filter(v => v).reduce((start, chunk) => {
      let lines = (chunk.visual || chunk.run).split("\n")
      return {
        data: [...start.data, ...(chunk.visual === chunk.run ? [] : lines.map((_, index) => ({
          class: "rxfiddle-input",
          line: start.line + index,
          where: "wrap" as "wrap",
        })))],
        line: start.line + lines.length,
      }
    }, { data: [], line: 0 }).data
  }

  public renderCode(input: string): { chunks: string[] } {
    return { chunks: this.normalize(input).map(c => c.run) }
    // if (typeof this.data.code === "string") {
    //   return { chunks: [this.data.code] }
    // }

    // let chunks = this.data.code.reduce((code, chunk) => {
    //   if (typeof chunk === "string") {
    //     return code
    //   } else {
    //     let last = code[code.length - 1]
    //     let [pre, post] = last.split(chunk.visual, 2)
    //     return [...code.slice(0, code.length - 2), pre, chunk.run, post]
    //   }
    // }, [input])
    // return { chunks }
  }
}

let samples: Sample[] = [
  new BmiSample({
    answers: [],
    checker: () => { return true },
    code: `
var weight = Rx.Observable.of(70, 72, 76, 79, 75);
var height = Rx.Observable.of(1.76, 1.77, 1.78);
var bmi = weight.combineLatest(height, (w, h) => w / (h * h));
bmi.subscribe(x => console.log('BMI is ' + x));`,
    question: `How many BMI values are logged? What is the last value logged?`,
    timeout: 600,
  }),

  new AdvancedSample({
    checker: () => { return true },
    code: [{
      run: `
this.queries = Rx.Observable.of("string")
this.searchService = {
  search: (query) => Rx.Observable.of("result")
}
this.render = () => {}
`, visual: `
// Inputs
var queries = /* Rx.Observable containing search string's */
var searchService = {
  search: function (query) { /* */ }
}
function render(results) { /* */ }
` }, `

// Sample Program
this.queries
  .debounce(100)
  .flatMap(query => this.searchService.search(query))
  .subscribe(this.render)

for(var i = 0; i < 10; i++){
  console.log("Test")
  console.warn("Test")
  console.info("Test")
}
`],
    question: `
    This sample represents a movie search engine. 
    The user types a query and expects a list of movies to be returned.
    However, the results he receives are not what he expects.
    Please find and fix the bug.`,
    timeout: 600,
  }),

  new DefaultSample({
    checker: () => { return true },
    code: `
Rx.Observable.generate(
    2, 
    x => true, 
    x => x + (x - 1),
    x => x
  )
  .take(10)
  .subscribe(x => test(x))
`,
    question: `What are the last 2 values arriving at the \`test\` function?`,
    timeout: 600,
  }),
]

export default samples

/* 
sample:
var weight = Rx.Observable.of(70, 72, 76, 79, 75);
var height = Rx.Observable.of(1.76, 1.77, 1.78);
var bmi = weight.combineLatest(height, (w, h) => w / (h * h));
bmi.subscribe(x => console.log('BMI is ' + x));
*/

/* 
This sample represents a movie search engine. The user types a query and expects a list of movies to be returned.
However, the results he receives are not what he expects. Please find and fix the bug.

// Inputs
var queries = /(* Rx.Observable containing search string's *)/
var searchService = {
  search: function (query) { /(* *)/ }
}
function render(results) { /(* *)/ }

// Sample Program
queries
  .debounce(100)
  .flatMap(query => searchService.search(query))
  .subscribe(render)

*/

/*
What are the last 2 values arriving at the `test` function?

Rx.Observable.generate(
    2, 
    x => true, 
    x => x + (x - 1),
    x => x
  )
  .take(10)
  .subscribe(x => test(x))

*/

/* 
You are building a snake game using Rx. The users report 

// Inputs
var clock = /(* Observable representing clock. Ticks every 500ms. *)/
var keyboardDirection = /(* Observable of { x: 0, 1 or -1, y: 0, 1 or -1 },
                                      up = { x: 0, y: -1 },
                                   right = { x: 1, y: 0 }
                        *)/
var candyPosition = /(* Observable of candy's location in x y coordinates: { x: number, y: number } *)/

// Sample Program
function trimLast(list) {
  return list.slice(0, list.length - 1)
}
function willCollide(body, point) {
  return body.some(b => b.x === point.x && b.y === point.y)
}

var initialState = { body: [{ x: 0, y: 0 }], points: 0 }

clock
  .combineLatest(
    keyboardDirection, candyPosition, 
    (clock, move, candyPos) => ({ move: move, candyPos: candyPos })
  )
  .scan((snake, nextInput) => {
    var head = {
      x: snake.body[0].x + move.x, 
      y: snake.body[0].y + move.y
    }
    if(head.x === candyPos.x && head.y === candyPos.y) {
      return { body: [head, ...snake.body]), points: snake.points + 1 }
    } else if(willCollide(snake.body, head)) {
      return initialState
    } else {
      return { body: [head, ...trimLast(snake.body)], points: snake.points }
    }
  }, initialState)

*/

function trim(input: string, limit: number = -1): string {
  if (limit < 0) { return input.trim() }
  if (limit === 0) { return input }
  if (input[input.length - 1] === "\n") {
    input = input.substr(0, input.length - 1)
  }
  if (input[0] === "\n") {
    input = input.substr(1)
  }
  return limit > 1 ? trim(input, limit - 1) : input
}
