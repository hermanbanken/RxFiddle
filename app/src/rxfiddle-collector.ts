import { ICallRecord, IGNORE, Visualizer } from "./rxfiddle-visualizer";
import "./utils";
import * as Rx from "rx";

let defaultSubjects = {
    "Observable": Rx.Observable,
    "Observable.prototype": Rx.Observable.prototype,
    "AbstractObserver.prototype": Rx.internals.AbstractObserver.prototype,
    "AnonymousObserver.prototype": Rx.AnonymousObserver.prototype,
  };

let i = 0;

export default class Instrumentation {
  public logger: Visualizer;
  private subjects: { [name: string]: any; };
  private calls: ICallRecord[] = [];
  constructor(subjects: { [name: string]: any; } = defaultSubjects, logger: Visualizer = new Visualizer()) {
    this.subjects = subjects;
    this.logger = logger;
    Object.keys(subjects).slice(0, 1).forEach((s: string) => subjects[s][IGNORE] = true);
  }

  public instrument(fn, extras) {
    let calls = this.calls;
    let logger = this.logger;

    let instrumented = function instrumented() {
      let call: ICallRecord = {
        arguments: [].slice.call(arguments, 0),
        method: extras.methodName,
        returned: null,
        stack: new Error().stack,
        subject: this,
        subjectName: extras.subjectName,
        time: performance.now(),
        id: i++,
      };
      calls.push(call);
      let returned = fn.apply(this, arguments);
      call.returned = returned;
      logger.log(call);
      return returned;
    };

    instrumented.__originalFunction = fn;
    return instrumented;
  }

  public deinstrument(fn) {
    return fn.__originalFunction || fn;
  }

  public setup(): void {
    let properties: { key: string, name: string, subject: any }[] = Object.keys(this.subjects)
      .map((name: string) => ({ name, subject: this.subjects[name] }))
      .map(({ name, subject }) => Object.keys(subject)
        .map(key => ({ key, name: name as string, subject }))
      )
      .reduce((prev, next) => prev.concat(next), []);

    let methods = properties
      .filter(({ key, subject }) => typeof subject[key] === "function");

    methods.forEach(({ key, name, subject }) => {
      subject[key] = this.instrument(subject[key], {
        methodName: key,
        subjectName: name,
      });
    });
  }
}
