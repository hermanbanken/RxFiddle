# rxfiddle-js-collector

A collector for [RxFiddle](..) to debug JavaScript containing Rx. 
The plugin consists of several pieces:

- [x] Something to parse the structure of in-source Observables.
- [x] Something to log the creation of, subscription on and data flow through Observables.
- [x] Something to get the data to RxFiddle

Available in [the app folder](../app/src/instrumentation/rxjs-4.1.0)