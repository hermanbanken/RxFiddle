# RxFiddle

RxFiddle is a debugger for Reactive Extensions (Rx). 

## Features
- [x] visualises structure of Observables in graph diagram,
- [x] visualises construction of and data flow through Observable sequences in Marble Diagrams,
- [ ] supports live fiddling with input streams,
- [ ] generates tests for Observable sequences.

## Collectors
RxFiddle works by means of a visualizer and *collectors* which can parse
syntax and instrument (compiled) code to collect the lifecycle of Observables:

- creation of Observable sequences
- subscriptions in a Observable sequence
- *onNext*, *onError* and *onComplete* events in Observable sequence

Existing collectors:

- [x] [JavaScript](rxfiddle-js-collector) for RxJS
- [ ] [JVM](rxfiddle-jvm-collector) for RxJava, RxKotlin and RxScala
- [ ] [Dalvik](rxfiddle-android-collector) for Rx on Android
- [ ] [Swift](rxfiddle-swift-collector) for RxSwift

### Contribute
Every help is welcome improving RxFiddle, either by improving the visualiser or
creating custom collectors for your favorite Rx-library. 

See [CONTRIBUTING.md](./CONTRIBUTING.md)

## Footnote
RxFiddle is part of my [Masters thesis](doc).

Herman Banken