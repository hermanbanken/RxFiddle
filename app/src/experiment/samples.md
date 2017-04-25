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