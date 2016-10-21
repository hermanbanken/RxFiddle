import "../utils";
import { RxFiddleNode } from "./node";
import { RxFiddleEdge } from "./edge";
import { IEvent, Event } from "./event";
import { ICallRecord, callRecordType } from "./callrecord";
import * as rx from "rx";
import * as dagre from "dagre";
import * as snabbdom from "snabbdom";
import { VNode } from "snabbdom";

const ErrorStackParser = require("error-stack-parser");
const h = require("snabbdom/h");
const patch = snabbdom.init([
  require("snabbdom/modules/attributes"),
  require('snabbdom/modules/eventlisteners'),
]);
const svgPanZoom = require("svg-pan-zoom");

export const HASH = "__hash";
export const IGNORE = "__ignore";

const inst_method = "instrumented";
const inst_file = "instrumentation.js";

// Expose protected properties of Observers
declare module "rx" {
  export interface Observable<T> { }
  export interface Observer<T> {
    source?: Observable<any>;
    o?: Observer<any>;
  }
}

type MethodName = string;

interface RxCollector {
  logSetup(from: Rx.Observable<any> | Rx.ObservableStatic, to: Rx.Observable<any>, using: [MethodName, StackFrame]): void
  logSubscribe(on: Rx.Observable<any>, observer: Rx.Observer<any>, destination?: Rx.Observable<any>): void
  logEvent(observer: Rx.Observer<any>, event: IEvent): void
}

export class Visualizer implements RxCollector {

  private g = new dagre.graphlib.Graph({ compound: true, multigraph: true });
  private svg: HTMLElement;
  private unrendered: number = 0;

  constructor() {
    this.g.setGraph({});
    this.g.setDefaultEdgeLabel(() => ({}));
  }

  private lookup: { [stackframe: string]: RxFiddleNode } = {};
  private observableLookup: { [hash: string]: RxFiddleNode } = {};
  private observerLookup: { [hash: string]: [Rx.Observable<any>, Rx.Observer<any>, IEvent[]] } = {};

  private static _nextId = 0;
  public static id(obs: Rx.Observable<any> | Rx.Observer<any>): string {
    if (typeof (<any>obs)[HASH] == "undefined") {
      (<any>obs)[HASH] = this._nextId++;
    }
    return (<any>obs)[HASH];
  }

  private trackd: any[] = [];

  public log(record: ICallRecord) {
    var stack = ErrorStackParser.parse(record).slice(1, 2)[0];

    // Anonymous observable
    if (record.method === "subscribe" && typeof record.arguments[0] === "function" && record.returned.observer) {
      this.trackd.push(record.returned);
      this.trackd.push(record.returned.observer);
      this.trackd.push(record.parent && record.parent.subject);
      console.log(
        record.subject.getName(), Visualizer.id(record.subject), record.method,
        Visualizer.id(record.returned), Visualizer.id(record.returned.observer),
        record.parent && Visualizer.id(record.parent.subject));
    }

    if (record.subject != null && 13 == record.subject[HASH]) {
      // debugger;
    }

    switch (callRecordType(record)) {
      case "setup":
        // if (record.parent) {
        //   console.log("internal usage", record.method, record.parent.method);
        //   return;
        // }

        this.logSetup(record.subjectName === "Observable.prototype" ? record.subject : record.subject.source, record.returned, [record.method, stack]);

        break;

      case "subscribe":
        let observer = typeof record.arguments[0] == 'object' ? record.arguments[0] as Rx.Observer<any> : record.returned;
        if (record.subject) {
          this.logSubscribe(record.subject, observer, observer.source || observer.parent);
        }

        if ([13, 40, 69, 86].indexOf(record.subject[HASH]) >= 0) {
          // debugger;
        }

        break;

      case "event":
        if ([13, 40, 69, 86].indexOf(record.subject[HASH]) >= 0) {
          // debugger;
        }

        this.logEvent(record.subject, Event.fromRecord(record))
    }
  }

  public logSetup(onto: Rx.Observable<any> | null, to: Rx.Observable<any>, using: [MethodName, StackFrame]) {
    // Try to reuse existing code point
    let nid = using[1].source,
      node = this.lookup[nid];
    if (typeof node == 'undefined') {
      this.lookup[nid] = node = new RxFiddleNode("" + Visualizer._nextId++, using[0], using[1]);
    }
    node.addObservable(to);

    // Handle nested call
    if (typeof this.observableLookup[Visualizer.id(to)] !== "undefined") {
      // Create of obs yielded existing.
      node = RxFiddleNode.wrap(this.observableLookup[Visualizer.id(to)], node);
    }

    // Store references
    this.g.setNode(node.id, node);
    this.observableLookup[Visualizer.id(to)] = node;

    this.unrendered += 1;

    // No edges for ObservableStatic method calls
    if (onto == null) return;

    if (typeof this.observableLookup[Visualizer.id(onto)] !== "undefined") {
      let edge = new RxFiddleEdge(this.observableLookup[Visualizer.id(onto)], node);
      this.g.setEdge(edge.from.id, edge.to.id, edge);
    } else {
      // debugger;
    }
  }

  public logSubscribe(on: Rx.Observable<any>, observer: Rx.Observer<any>, destination?: Rx.Observable<any>) {
    let node = this.observableLookup[Visualizer.id(on)]
    if (node) {
      this.observerLookup[Visualizer.id(observer)] = node.addObserver(on, observer);
      this.unrendered += 1;
    } else {
      // debugger;
    }
  }

  public logEvent(observer: Rx.Observer<any>, event: IEvent) {
    let tuple = this.observerLookup[Visualizer.id(observer)];
    if (typeof tuple != "undefined") {
      tuple[2].push(event);
    }
    this.unrendered += 1;
  }

  public render() {
    let ns = this.g.nodes().map((id: string) => this.g.node(id).render(patch)).reduce((p, c) => p.concat(c), []);
    let es = this.g.edges().map((e: Dagre.Edge) => {
      let edge = this.g.edge(e);
      return edge.render();
    });
    let childs = ns.concat(es);
    let graph = this.g.graph();
    return h("svg", {
      attrs: {
        id: "svg",
        style: "width: 100vw; height: 100vh",
        version: "1.1",
        viewBox: `0 0 ${graph.width} ${graph.height}`,
        xmlns: "http://www.w3.org/2000/svg",
      },
    }, childs);
  }

  public run() {
    this.unrendered = 0;
    dagre.layout(this.g);
    this.svg.innerHTML = "";

    let updated = this.render();
    patch(this.svg, updated);
    this.svg = updated;
    let instance = svgPanZoom("#svg", { maxZoom: 30 });
  }
  public attach(node: HTMLElement) {
    this.svg = node;
    this.step();
  }
  public step() {
    window.requestAnimationFrame(() => this.step());
    if (this.unrendered === 0) {
      return;
    }
    this.run();
  }
}
