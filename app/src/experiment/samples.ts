import { LineClasses, Ranges } from "../ui/codeEditor"
import { TestEvent, TestState } from "./screens"
import * as Rx from "rxjs"
import h from "snabbdom/h"
import { VNode } from "snabbdom/vnode"
import { elvis } from "../collector/collector"

export type Sample = {
  id: string,
  code: string,
  question: VNode | string,
  timeout: number,
  renderQuestion(state: TestState, dispatcher: (event: TestEvent) => void): Rx.Observable<VNode>
  renderCode?(input?: string): { chunks: string[] }
  codeRanges?(): Ranges
  lineClasses?(): LineClasses
  checker: (data: any) => boolean
  handleSubmit?: (state: TestState, dispatcher: (event: TestEvent) => void, data: any) => void
}

export type CodeChunk = { run: string, visual: string } | string
export type Code = string | CodeChunk[]

export type SampleData<T> = {
  id: string,
  code: Code,
  question: string,
  checker: (answers: T) => boolean,
  timeout: number,
}

class DefaultSample<T> implements Sample {
  public get id() { return this.data.id }
  public get code() {
    return typeof this.data.code === "string" ?
      this.data.code :
      this.data.code
        .map(_ => typeof _ === "object" ? _.visual : _)
        .join("\n")
  }
  public get checker() { return this.data.checker }
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

class DummySample extends DefaultSample<void> {
  constructor(data: SampleData<void>) {
    super(data)
  }

  public get checker() {
    return (value: any) => true
  }

  public renderQuestion(state: TestState, dispatcher: (event: TestEvent) => void): Rx.Observable<VNode> {
    return Rx.Observable.of(h("div", [
      h("div.control", [
        h("label", `If you have familiarized yourself with the tool, hit Submit`),
      ]),
    ]))
  }

  public handleSubmit(state: TestState, dispatcher: (e: TestEvent) => void, data: any) {
    dispatcher({
      path: [this.id],
      type: "answer",
      value: {
        completed: true,
      },
    })
  }
}

function validState(actual: any, expected: any): string {
  if (typeof actual === "undefined") {
    return ""
  } else if (typeof expected === "function" ? expected(actual) : actual === expected) {
    return "valid"
  } else {
    return "invalid"
  }
}

class GenerateSample extends DefaultSample<{ value1: number, value2: number }> {
  constructor(data: SampleData<{ value1: number, value2: number }>) {
    super(data)
  }

  public get checker() {
    return (value: any) => value.value1 === 257 && value.value2 === 513
  }

  public renderQuestion(state: TestState, dispatcher: (event: TestEvent) => void): Rx.Observable<VNode> {
    return Rx.Observable.of(h("div", [
      h("p", `What are the last 2 values arriving at the \`survey.render\` function?`),
      h("div.control", [
        h("label", `Values:`),
        h("input", {
          attrs: {
            class: validState(elvis(state, ["data", this.id, "value1"])[0], 257),
            name: "value1", placeholder: "enter a number", type: "number",
            value: elvis(state, ["data", this.id, "value1"])[0],
          },
        }), ",",
        h("input", {
          attrs: {
            class: validState(elvis(state, ["data", this.id, "value2"])[0], 513),
            name: "value2",
            placeholder: "enter a number",
            step: "any", type: "number",
            value: elvis(state, ["data", this.id, "value2"])[0],
          },
        }),
      ]),
    ]))
  }

  public handleSubmit(state: TestState, dispatcher: (e: TestEvent) => void, data: any) {
    let value = {
      completed: false,
      value1: parseInt(data.value1.value, 10) || null,
      value2: parseInt(data.value2.value, 10) || null,
    }
    value.completed = this.checker(value)
    dispatcher({
      path: [this.id],
      type: "answer",
      value,
    })
  }
}

class BmiSample extends DefaultSample<{ count: number, last: number }> {
  constructor(data: SampleData<{ count: number, last: number }>) {
    super(data)
  }

  public get checker() {
    return (value: any) => value.count === 8 && Math.round(value.last) === Math.round(23.67)
  }

  public renderQuestion(state: TestState, dispatcher: (event: TestEvent) => void): Rx.Observable<VNode> {
    return Rx.Observable.of(h("div", [
      h("div.control", [
        h("label", `How many BMI values are logged?`),
        h("input", {
          attrs: {
            class: validState(elvis(state, ["data", this.id, "count"])[0], 8),
            name: "count", placeholder: "enter a number", type: "number",
            value: elvis(state, ["data", this.id, "count"])[0],
          },
        }),
      ]),
      h("div.control", [
        h("label", `What is the last value logged?`),
        h("input", {
          attrs: {
            class: validState(elvis(state, ["data", this.id, "last"])[0], (value: number) => 24 === Math.round(value)),
            name: "last",
            placeholder: "enter nearest integer BMI value",
            step: "any", type: "number",
            value: elvis(state, ["data", this.id, "last"])[0],
          },
        }),
      ]),
    ]))
  }

  public handleSubmit(state: TestState, dispatcher: (e: TestEvent) => void, data: any) {
    let value = {
      completed: false,
      count: parseInt(data.count.value, 10) || null,
      last: parseFloat(data.last.value) || null,
    }
    value.completed = this.checker(value)
    dispatcher({
      path: [this.id],
      type: "answer",
      value,
    })
  }
}

class TimeBugSample extends DefaultSample<{ count: number, last: number }> {
  constructor(data: SampleData<{ count: number, last: number }>) {
    super(data)
  }

  public get checker() {
    return (value: any) => value.year === 2039
  }

  public renderQuestion(state: TestState, dispatcher: (event: TestEvent) => void): Rx.Observable<VNode> {
    return Rx.Observable.of(h("div", [
      h("div.control", [
        h("label", `In which year does the lottery server fail?`),
        h("input", {
          attrs: {
            class: validState(elvis(state, ["data", this.id, "year"])[0], 2039),
            name: "year", placeholder: "enter a number", type: "number",
            value: elvis(state, ["data", this.id, "year"])[0],
          },
        }),
      ]),
    ]))
  }

  public handleSubmit(state: TestState, dispatcher: (e: TestEvent) => void, data: any) {
    let value = {
      completed: false,
      year: parseInt(data.year.value, 10) || null,
    }
    value.completed = this.checker(value)
    dispatcher({
      path: [this.id],
      type: "answer",
      value,
    })
  }
}

class ImdbSample extends DefaultSample<{ firstresult: string, replaced: string, replaced_with: string }> {
  constructor(data: SampleData<{ firstresult: string, replaced: string, replaced_with: string }>) {
    super(data)
  }

  public get checker() {
    return (value: any) =>
      typeof value.firstresult === "string" && value.firstresult.toLowerCase() === "them" &&
      typeof value.firstresult === "string" && value.replaced.toLowerCase() === "flatmap" &&
      (
        typeof value.firstresult === "string" && value.replaced_with.toLowerCase() === "switchmap" ||
        typeof value.firstresult === "string" && value.replaced_with.toLowerCase() === "flatmaplatest"
      )
  }

  public renderQuestion(state: TestState, dispatcher: (event: TestEvent) => void): Rx.Observable<VNode> {
    return Rx.Observable.of(h("div", { style: { "max-width": "500px" } }, [
      h("p", `The example below is a piece of a movie search website.
              You can enter a movie name and the site looks it up in a database.
              John - a tester - searches for "The Titanic", however he sees all 
              kinds of other (non relevant) movie results too. What could be wrong?`),
      h("div.control", [
        h("label", `After he's done typing, and all async requests are done,
                    what is the movie at the top of the result list?`),
        h("input", {
          attrs: {
            class: validState(elvis(state, ["data", this.id, "firstresult"])[0],
              (v: string) => v.toLowerCase() === "them"),
            name: "firstresult", placeholder: "", type: "text",
            value: elvis(state, ["data", this.id, "firstresult"])[0],
          },
        }),
      ]),
      h("div.control", [
        h("label", `What operator do you need to replace for correct behaviour?`),
        h("input", {
          attrs: {
            class: validState(elvis(state, ["data", this.id, "replaced"])[0],
              (v: string) => v.toLowerCase() === "flatmap"),
            name: "replaced", placeholder: "", type: "text",
            value: elvis(state, ["data", this.id, "replaced"])[0],
          },
        }),
      ]),
      h("div.control", [
        h("label", `What operator should take it's place?`),
        h("input", {
          attrs: {
            class: validState(elvis(state, ["data", this.id, "replaced_with"])[0],
              (v: string) => v.toLowerCase() === "switchmap" || v.toLowerCase() === "flatmaplatest"),
            name: "replaced_with", placeholder: "", type: "text",
            value: elvis(state, ["data", this.id, "replaced_with"])[0],
          },
        }),
      ]),
    ]))
  }

  public handleSubmit(state: TestState, dispatcher: (e: TestEvent) => void, data: any) {
    let value = {
      completed: false,
      firstresult: data.firstresult.value,
      replaced: data.replaced.value,
      replaced_with: data.replaced_with.value,
    }
    value.completed = this.checker(value)
    dispatcher({
      path: [this.id],
      type: "answer",
      value,
    })
  }
}

let samples: Sample[] = [
  new DummySample({
    id: "sample_dummy",
    checker: () => { return true },
    code: `
//// First uncomment the next line and hit "Run":
// Rx.Observable.of(1, 2, 3).map(x => x * 2).subscribe(x => console.log(x))
//// Try to find the numbers in the tool on the right

//// Recomment/remove the previous lines and continue

//// Then uncomment the next line and hit "Stop" then "Run" again:
// Rx.Observable.interval(1000).map(x => x * 2).subscribe(x => console.log(x))
//// See how it is live updating? Hit "Stop" to cancel execution

//// Then uncomment the following lines and hit "Run" again:
// var a = Rx.Observable.of(1, 2, 3).map(x => x * 2)
// var b = Rx.Observable.of(1, 2, 3)
// a.concat(b).subscribe(x => console.log(x))
//// A structure emerges

//// Now continue with the next question (Submit)
`,
    question: ``,
    timeout: 4 * 60,
  }),
  new GenerateSample({
    id: "sample_generate",
    checker: (data) => { return true },
    code: `
Rx.Observable.range(2, 10)
  .scan((x, next) => x + (x - 1))
  .subscribe(value => {
    survey.render(value)
  })
`,
    question: ``,
    timeout: 600,
  }) as Sample,
  new BmiSample({
    id: "sample_bmi",
    checker: () => { return true },
    code: `
// Steams of input data
var weight$ = survey.bmi.weight$; // : Rx.Observable<number>
var height$ = survey.bmi.height$; // : Rx.Observable<number>

// BMI
var bmi$ = weight$
  .combineLatest(height$, (w, h) => w / (h * h));

bmi$.subscribe(x => {
  survey.log('BMI is ' + x)
}, err => {}, () => {
  console.log("measurements complete")
});

// Emulate passing of time
survey.scheduler.advanceTo(10000)`,
    question: ``,
    timeout: 600,
  }),
  new TimeBugSample({
    id: "sample_time",
    checker: () => { return true },
    code: `
// newYear$ : Rx.Observable<Date> current date, every year
var newYear$ = survey.lottery.newYear$
  .map(date => date.toUTCString())

// server : Date => Rx.Observable<LotteryResult>
let server = survey.lottery.veryOldServer

newYear$
  .flatMap(date => server(date))
  .subscribe(
    lotteryResult => {
      survey.renderSomething(lotteryResult)
    },
    err => survey.showError(err)
  )

// Advance time very far into the future
survey.scheduler.advanceTo(1e20)`,
    question: ``,
    timeout: 600,
  }),
  new ImdbSample({
    id: "sample_imdb",
    checker: () => { return true },
    code: `
// input : Rx.Observable<string>
var input = survey.imdb.johnsInput$
  .do(x => console.log("input: "+x))

input
  .debounce(50, survey.scheduler)
  .flatMap(q => { return survey.imdb.findMoviesAsync(q) })
  .subscribe(list => survey.imdb.render(list))

// Advance time very far into the future
survey.scheduler.advanceTo(1e6)`,
    question: ``,
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

let oldImdb = new AdvancedSample({
  id: "sample_search",
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
})