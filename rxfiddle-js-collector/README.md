# RxFiddle for RxJS

RxFiddle is a debugger for Reactive Extensions (Rx). 
Add this (rxfiddle) module to your applications repository to inspect your
Observable data flow on [RxFiddle.net](https://rxfiddle.net).

<img src="https://raw.githubusercontent.com/hermanbanken/RxFiddle/08609509012fc01ae51a44e84b8c81251236e684/screenshots/mergeAll.png" width="400" alt="Screenshot of RxFiddle.net" />

## Getting started

You can use this RxFiddle npm plugin in 2 different environments:

- Browser: instrument and then use `RxFiddle.openWindow()`
- Node: instrument and then use `RxFiddle.serve()`

Or you can use auto detect: instrument and then use `RxFiddle.auto()`

### Instrumenting
You instrument Rx by providing the reference to RxFiddle. Since you can import, require or include Rx in different ways, RxFiddle accepts references to Rx in multiple ways. For example if you use the ES6 modular imports:

````javascript
/* File: your-application.js */
import { Observable } from "rxjs/Observable"
import { Subscriber } from "rxjs/Subscriber"
import "rxjs/add/observable/of"
import "rxjs/add/operator/map"
import RxFiddle from "rxfiddle"

new RxFiddle({
  Observable: Observable,
  Subscriber: Subscriber,
}).serve({ port: 8080 }) // or openWindow for web environments

/* Rest of your application here */
Observable.of(1, 2, 3)
  .map(x => x * 2)
  .subscribe()
````

Then run your application (`node your-application.js`) and 
visit [rxfiddle.net](https://rxfiddle.net) entering `localhost:8080` as the port.
Note that RxFiddle works completely on your machine only when using websocket collectors: 
no code and or event data is send to rxfiddle's servers. 
If you're afraid it does, feel free to run the [RxFiddle App](https://github.com/hermanbanken/RxFiddle) 
on your own machine.

If you have taken the shortcut of importing using `import * as Rx from "rxjs"` then you can use the following shortcut for instrumentation:

````javascript
import * as Rx from "rxjs"
import RxFiddle from "rxfiddle"

new RxFiddle({ Rx }).serve({ port: 8080 })

/* Rest of your application here */
Rx.Observable.of(1, 2, 3)
  .map(x => x * 2)
  .subscribe()
````

## Features
See the [RxFiddle repository](https://github.com/hermanbanken/RxFiddle) for the full list of features.

## Collectors
RxFiddle works by means of a visualizer and *collectors* which can parse
syntax and instrument (compiled) code to collect the lifecycle of Observables:

- creation of Observable sequences
- subscriptions in a Observable sequence
- *next*, *error* and *complete* events in Observable sequence

Existing collectors:

- [x] [JavaScript](https://github.com/hermanbanken/RxFiddle/tree/master/rxfiddle-js-collector) for RxJS
- [ ] [JVM](https://github.com/hermanbanken/RxFiddle/tree/master/rxfiddle-jvm-collector) for RxJava, RxKotlin and RxScala
- [ ] [Dalvik](https://github.com/hermanbanken/RxFiddle/tree/master/rxfiddle-android-collector) for Rx on Android
- [ ] [Swift](https://github.com/hermanbanken/RxFiddle/tree/master/rxfiddle-swift-collector) for RxSwift

### Contribute
Every help is welcome improving RxFiddle, either by improving the visualiser or
creating custom collectors for your favorite Rx-library. 

You can find samples of the expected output in the dist folder after running the tests (`npm run test`).

## Footnote
RxFiddle was created as part of my [Masters thesis](https://github.com/hermanbanken/RxFiddle/tree/master/doc).

Herman Banken