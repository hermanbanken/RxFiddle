import h from "snabbdom/h"
import { VNode } from "snabbdom/vnode"
import * as Rx from "rx"

export type Sample = {
  code: string,
  question: string,
  timeout: number,
  renderQuestion: Rx.Observable<VNode>
}

export type SampleData<T> = {
  code: string, question: string,
  checker: (answers: T) => boolean,
  timeout: number,
  answers?: T
}

class DefaultSample<T> implements Sample {
  public get code() { return this.data.code }
  public get question() { return this.data.question }
  public get timeout() { return this.data.timeout }
  private data: SampleData<T>
  constructor(data: SampleData<T>) {
    this.data = data
  }
  public get renderQuestion(): Rx.Observable<VNode> {
    return Rx.Observable.just(h("div.q", this.question))
  }
}

let samples: Sample[] = [
  new DefaultSample({
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
  new DefaultSample({
    checker: () => { return true },
    code: `
// Inputs
var queries = /* Rx.Observable containing search string's */
var searchService = {
  search: function (query) { /* */ }
}
function render(results) { /* */ }

// Sample Program
queries
  .debounce(100)
  .flatMap(query => searchService.search(query))
  .subscribe(render)
`,
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
    x => x + (x - 1)
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
    x => x + (x - 1)
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