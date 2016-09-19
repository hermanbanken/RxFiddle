# rxfiddle-jvm-collector

A collector for [RxFiddle](..) to run inside a JVM. The plugin consists of several pieces:

- [ ] AST parser which logs the structure of in-source Observables.
- [x] ByteCode instrumentation (BCI) which inserts logging of the creation of, subscription on and data flow through Observables.
- [ ] (WebSocket) server emitting all collected events

The ByteCode instrumentation appends logic before and after each method call returning an Observable.
This logs the creation of the Observable sequences.
Next the ClassVisitors map all subscribe, onNext, onError and onComplete calls.

### Running
To run the ByteCode instrumentation as an agent start with the following JVM arguments:

````bash
-javaagent:<some-build-dir>/rxfiddle-java-collector-0.1-SNAPSHOT.jar
````

### References

For references see:

- [ScalaDays 2015 Amsterdam presentation by Tal Weiss](https://www.youtube.com/watch?v=y4Ex6bsTv3k) on BCI
- [Jon Bell's blog](http://jonbell.net/2015/10/new-blog-series-java-bytecode-and-jvmti-examples/) about Java ByteCode and JVMTI
- [Jon Bell's examples on github](https://github.com/jon-bell/bytecode-examples/) on using ASM
- One day optimise by [using JavaAssist](http://blog.javabenchmark.org/2013/05/java-instrumentation-tutorial.html)
