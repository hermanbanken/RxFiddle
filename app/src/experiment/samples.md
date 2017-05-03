# Sample A
- How many BMI values are logged?
- What is the last value logged?

````javascript
/**
 * BMI calculator
 * @param weight : Rx.Observable<number>
 * @param height : Rx.Observable<number>
 */
function main(weight, height, display) {

  weight
    .combineLatest(height, (w, h) => w / (h * h))
    .subscribe(display)

}

// Run with dependencies
main(sample.weight, sample.height)
````

````javascript
{
  weight: Rx.Observable.of(70, 72, 76, 79, 75),
  height: Rx.Observable.of(1.76, 1.77, 1.78),
  display: (bmi) => {}
}
````

# Sample B
This sample represents a movie search engine. 
The user types a query and expects a list of movies to be returned.
However, the result she sees do not match her query.

Please find and fix the bug.

````javascript
/**
 * Movie Search Engine
 * @param queries : Rx.Observable<string>
 * @param searchService : { 
 *   search: (query: string) => Rx.Observable<Result> 
 * }
 * @param render : (result: Result) => void
 */
function main(queries, searchService, render) {

  queries
    .debounce(100)
    .flatMap(query => searchService.search(query))
    .subscribe(render)

}

// Run with dependencies
main(sample.queries, sample.searchService, sample.render)
````

````javascript
{
  queries: Rx.Observable.just("string"),
  searchService: { 
    search: (query) => Rx.Observable.just("result") 
  },
  render: (out) => {}
}
````

# Sample C
This view combines data from 3 different sources. 

````javascript
(function (queries, searchService, render) {


  // Sample Program
  queries
    .debounce(100)
    .flatMap(query => searchService.search(query))
    .subscribe(render)


})(
  // Dependencies
  Rx.Observable.just("string"),
  { search: (query) => Rx.Observable.just("result") },
  (out) => {}
)
````

````javascript
function main(inp) {

  inp.queries
    .debounce(50)
    .flatMap(query => inp.searchService.search(query))
    .subscribe(inp.render)

}

let final = "the titanic"
main({
  queries: Rx.Observable
  	.range(1,final.length)
    .map(i => [i, final.substr(0, i)])
    .delay(0, ([i, s]) => Rx.Observable.timer(i * Math.random() * 80))
    .map(list => list[1]),
  searchService: { 
    search: (query) => Rx.Observable
    	.just("result for "+query)
    	.delay(0, t => Rx.Observable.timer(t.length * 200))
  },
  render: (out) => {}
})
````

# Sample D
Recursion:
[Ben Lesh answering on SO](http://stackoverflow.com/questions/27514310/turning-paginated-requests-into-an-observable-stream-with-rxjs)

````javascript
function getPageFromServer(index) {
    // return dummy data asynchronously for testcase
    // use timeout scheduler to force the result to be asynchronous like
    // it would be for a real service request
    return Rx.Observable.return({
      nextpage: index + 1, 
      data: [1,2,3]
    })
    .delay(500);

    // for real request, if you are using jQuery, just use rxjs-jquery and return:
    //return Rx.Observable.defer(function () { return $.ajaxAsObservable(...); });
}

function getPagedItems(index) {
    var result = getPageFromServer(index)
        .retry(3) // retry the call if it fails
        .flatMap(function (response) {
            var result = Rx.Observable.fromArray(response.data);
            if (response.nextpage !== null) {
                result = result.concat(getPagedItems(response.nextpage));
            }
            return result;
        });

    // If you think you will really satisfy requests synchronously, then instead
    // of using the Rx.Scheduler.timeout in getPageFromServer(), you can
    // use the currentThreadScheduler here to prevent the stack exhaustion...

    // return result.observeOn(Rx.Scheduler.currentThread) 
    return result;
}

getPagedItems(0).take(20).subscribe()
````

# Sample E
[Weird stuff](http://stackoverflow.com/questions/34545217/rxjs-how-to-poll-an-api-to-continuously-check-for-updated-records-using-a-dynam)

````javascript
var modifiedSinceInitValue = 100 // put your date here
var polling_frequency = 1000 // put your value here
var initial_state = {modifiedSince: modifiedSinceInitValue, itemArray : []}
function max(property) {
  return function (acc, current) {
    acc = current[property] > acc ? current[property] : acc;
  }
}    
var data$ = Rx.Observable.return(initial_state)
  .expand((state) => fetchItem(state.modifiedSince)
          .toArray()
          .combineLatest(
    		Rx.Observable.interval(polling_frequency).take(1), 
            (itemArray, _) => ({
              modifiedSince: itemArray.reduce(
                max('updatedAt'), 
                modifiedSinceInitValue
              ),
              itemArray: itemArray
            })
		  )
  ).take(5).subscribe()

function fetchItem(since) {
  return Rx.Observable.of({ updatedAt: 100 },{ updatedAt: 100 },{ updatedAt: 100 })
}
````

# Sample F

> [Jacek Jankowski @jacol12345 09:56](https://gitter.im/Reactive-Extensions/RxJS?at=58f9bb2d8fcce56b2021bff2)
>
> Hi, I've been trying to crack this for some time and 
> I'd really appreaciate help here:
> I have an observable of string messages. I'm using a 
> snackbar to display them (a snack appears for 2 seconds, 
> then disappears), so I need to transform this observable 
> into one that emits values not more often than i.e. 3 seconds.

````javascript
function main(messages, snackbar, scheduler) {
  return messages
    .concatMap(x => Rx.Observable
      .just(x)
      .merge(Rx.Observable.timer(3000, scheduler).skip(1))
    )
    .map(x => x)
}

const onNext = Rx.ReactiveTest.onNext;
const onCompleted = Rx.ReactiveTest.onCompleted;

let scheduler = new Rx.TestScheduler();
let messages = scheduler.createHotObservable(
  onNext(500, "Please login first"),
  onNext(5140, "Fill in the name field"),
  onNext(5200, "Don't do that!"),
  onNext(5300, "Quit the app!"),
  onNext(19000, "Don't you want to save your changes?")
)

let snackbar = (m) => console.log(m)
var result = scheduler.startScheduler(
  main.bind(null, messages, snackbar, scheduler),
  { created: 0, subscribed: 0, disposed: 20000 }
)
console.log(result.messages)
````

## RxDevCon delivered sample
[nhaarman](https://rxdevcon.slack.com/team/nhaarman)

````kotlin
private val userAccountObservable = Observable.defer {
    val cached = cacher.get("user_account").map { Cached(it) }.toObservable()
    val network = userAccountApi.userAccount().map { Fresh(it) }.toObservable()

    network.publish { network ->
        Observable.merge(network, cached.takeUntil(network))
    }.flatMapSingle { cache(it) }
}.replay(1).refCount()
````

````javascript
let cacher = {
  get: (name) => Rx.Observable.timer(100).map(_ => "cached " + name),
  store: (name, value) => {}
}
let userAccountApi = {
  userAccount: () => Rx.Observable.timer(200).map(_ => "fresh user_account")
}

let userAccountObservable = Rx.Observable
.defer(() => {
  let cached = cacher.get("user_account")
  let network = userAccountApi.userAccount()
  return network.publish(network => Rx.Observable
    .merge(network, cached.takeUntil(network))
  ).do(value => cacher.store("user_account", value))
})
.replay(1)
.refCount()

userAccountObservable.subscribe()
````

# Sample gorgeous
[Have withLatestFrom wait until all sources have produced one value](http://stackoverflow.com/questions/39097699/have-withlatestfrom-wait-until-all-sources-have-produced-one-value)

> The contract needs to be: if source1 emits then combined will always 
> eventually emit when the other sources finally produce. If source1 
> emits multiple times while waiting for the other sources we can use 
> the latest value and discard the previous values.

````javascript
// Use with RxJS 5 (RxJS 4 graph becomes cyclic)

var source1 = Rx.Observable.interval(500).take(5)
var source2 = Rx.Observable.interval(1000).take(2)
var source3 = Rx.Observable.interval(2000).take(2)

var selector = (a,b,c) => [a,b,c]

var operator = (s1, s2, s3) => Rx.Observable
  .merge(
    s1.combineLatest(s2, s3, selector).take(1),
    s1.skip(1).withLatestFrom(s2, s3, selector)
  )

var combined = source1.publish(s1 => 
                 source2.publish(s2 => 
                   source3.publish(s3 => 
                     operator(s1, s2, s3)
                   )));

combined.subscribe()
````

http://rxfiddle.net/#lib=rxjs5&type=editor&code=dmFyIHNvdXJjZTEgPSBSeC5PYnNlcnZhYmxlLmludGVydmFsKDUwMCkudGFrZSg1KQp2YXIgc291cmNlMiA9IFJ4Lk9ic2VydmFibGUuaW50ZXJ2YWwoMTAwMCkudGFrZSgyKQp2YXIgc291cmNlMyA9IFJ4Lk9ic2VydmFibGUuaW50ZXJ2YWwoMjAwMCkudGFrZSgyKQoKdmFyIHNlbGVjdG9yID0gKGEsYixjKSA9PiBbYSxiLGNdCgp2YXIgb3BlcmF0b3IgPSAoczEsIHMyLCBzMykgPT4gUnguT2JzZXJ2YWJsZQogIC5tZXJnZSgKICAgIHMxLmNvbWJpbmVMYXRlc3QoczIsIHMzLCBzZWxlY3RvcikudGFrZSgxKSwKICAgIHMxLnNraXAoMSkud2l0aExhdGVzdEZyb20oczIsIHMzLCBzZWxlY3RvcikKICApCgp2YXIgY29tYmluZWQgPSBzb3VyY2UxLnB1Ymxpc2goczEgPT4gCiAgICAgICAgICAgICAgICAgc291cmNlMi5wdWJsaXNoKHMyID0+IAogICAgICAgICAgICAgICAgICAgc291cmNlMy5wdWJsaXNoKHMzID0+IAogICAgICAgICAgICAgICAgICAgICBvcGVyYXRvcihzMSwgczIsIHMzKQogICAgICAgICAgICAgICAgICAgKSkpOwoKY29tYmluZWQuc3Vic2NyaWJlKCk=

# IMDB 

````javascript
let final = "the titanic"
let scheduler = new Rx.TestScheduler()

const onNext = Rx.ReactiveTest.onNext;
const onCompleted = Rx.ReactiveTest.onCompleted;

function inputStream(text) {
  let t = 0
  let messages = []
  for(let i = 0; i <= text.length; i++) {
    t += 30 + Math.random() * 100
    messages.push(onNext(t, text.slice(0, i)))
  }
  return scheduler.createHotObservable(messages)
}

let list = [
  "The Titanic",
  "Lion King",
  "Belle & The Beast",
  "Avatar",
  "Harry Potter",
  "Guardians of the Galaxy",
  "House of Cards",
  "Spectre",
  "Interstellar",
  "Iron Man",
  "Terminator Genisys",
]
function findMovie(term) {
  let result = list.filter(movie => movie.toLowerCase().indexOf(term.toLowerCase()) >= 0)
  let t = 200 * result.length
  return scheduler.createHotObservable(
    onNext(t, result),
    onComplete(t+1)
  )
}

scheduler.advanceTo(0)
inputStream("the titanic").debounce(50, scheduler).flatMap(findMovie).subscribe()

scheduler.advanceTo(1e6)
````

#### Android Lifecycle

````javascript

function mainActivity(lifecycle) {
  lifecycle
}

function dialogActivity(lifecycle) {
  lifecycle
}

mainActivity(getLifecycle())
dialogActivity(getLifecycle())

function getLifecycle() {
  return scheduler.createHotObservable(
    
  )
}

let scheduler = new Rx.TestScheduler()
const onNext = Rx.ReactiveTest.onNext;
const onCompleted = Rx.ReactiveTest.onCompleted;
scheduler.advanceTo(0)

inputStream("the titanic").debounce(50, scheduler).flatMap(findMovie).subscribe()

scheduler.advanceTo(1e6)

````

#### Millenium bug all over again

````javascript
let scheduler = new Rx.TestScheduler()
const onNext = Rx.ReactiveTest.onNext;
const onCompleted = Rx.ReactiveTest.onCompleted;
scheduler.advanceTo(0)

function veryOldLotteryServer(date) {
  let unix = new Date(date).getTime() / 1000
  if(unix > Math.pow(2, 31)) throw new Error("Crash!")
  else return scheduler.createHotObservable(
    onNext(0, { msg: "calculating" }),
    onNext(10, { msg: "Happy new year!", winningTicket: Math.round(Math.random()*10) }), 
    onCompleted(20)
  )
}

let start = new Date("2017-01-01").getTime()
let year = 1000 * 3600 * 24 * 365.25
Rx.Observable.interval(year, scheduler)
  .map(t => new Date(start + t * year).toString())
  .flatMap(veryOldLotteryServer)
  .subscribe(lottery => {}, e => {})

scheduler.advanceTo(1e20)
````


#### Chat room

````javascript
let scheduler = new Rx.TestScheduler()
const onNext = Rx.ReactiveTest.onNext;
const onCompleted = Rx.ReactiveTest.onCompleted;
scheduler.advanceTo(0)



````