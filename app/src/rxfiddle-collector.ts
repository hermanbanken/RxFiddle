import { ICallRecord, IGNORE, Visualizer } from "./rxfiddle-visualizer";
import "./utils";
import * as Rx from "rx";

let defaultSubjects = {
    "Rx.Observable": Rx.Observable,
    "Rx.Observable.prototype": Rx.Observable.prototype,
    "AnonymousObserver": Rx.AnonymousObserver.prototype,
  };

export default class Instrumentation {
  public logger: Visualizer;
  private subjects: { [name: string]: any; };
  private calls: ICallRecord[] = [];
  constructor(subjects: { [name: string]: any; } = defaultSubjects, logger: Visualizer = new Visualizer()) {
    this.subjects = subjects;
    this.logger = logger;
    Object.keys(subjects).slice(0, 2).forEach((s: string) => subjects[s][IGNORE] = true);
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
    let instrumentation = this;
    methods.forEach(({ key: methodName, name, subject }) => {
        let originalMethod = subject[methodName];
        function instrumented() {
          let call: ICallRecord = {
            arguments: [].slice.call(arguments, 0),
            method: methodName,
            returned: null,
            stack: new Error().stack,
            subject: this,
            subjectName: name,
            time: performance.now(),
          };
          instrumentation.calls.push(call);
          let returned = originalMethod.apply(this, arguments);
          call.returned = returned;
          instrumentation.logger.log(call);
          return returned;
        }
        subject[methodName] = instrumented;
      });
  }
}
