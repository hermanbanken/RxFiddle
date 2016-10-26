import "../utils";
import { RxFiddleNode } from "./node";
import { RxFiddleEdge } from "./edge";
import { IEvent, Event, Subscribe } from "./event";
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

const svgPanZoom = typeof window != "undefined" ? require("svg-pan-zoom") : {};

function isStream(v: Rx.Observable<any>): boolean {
  return v instanceof (<any>Rx)["Observable"];
}

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

export type MethodName = string;

export interface RxCollector {
  logSetup(from: Rx.Observable<any> | Rx.ObservableStatic, to: Rx.Observable<any>, using: [MethodName, StackFrame]): void
  logSubscribe(on: Rx.Observable<any>, observer: Rx.Observer<any>, destination?: Rx.Observable<any>): void
  logEvent(observer: Rx.Observer<any>, event: IEvent): void
  logLink(root: Rx.Observable<any>, child: Rx.Observable<any>): void
  wrapHigherOrder<T>(subject: Rx.Observable<any>, fn: Function): (arg: T) => T

  before(record: ICallRecord, parents?: ICallRecord[]): this;
  after(record: ICallRecord): void;
}

export class Visualizer implements RxCollector {

  private g = new dagre.graphlib.Graph({ compound: true, multigraph: true });
  private svg: HTMLElement | VNode;
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

  public findNode(record: ICallRecord): RxFiddleNode {
    let stack = ErrorStackParser.parse(record).slice(1, 2)[0];
    if (typeof this.lookup[stack.source] !== "undefined") {
      return this.lookup[stack.source];
    } else {
      var match = this.subGraphs()
        .find(g => g.findNode(record) != null);
      if (match) {
        return match.findNode(record);
      }
    }
    return null;
  }

  public findForSubject(obs: Rx.Observable<any> | Rx.Observer<any>): Visualizer {
    if (
      typeof this.observableLookup[Visualizer.id(obs)] !== "undefined" ||
      typeof this.observerLookup[Visualizer.id(obs)] !== "undefined"
    ) {
      return this;
    } else {
      var match = this.subGraphs()
        .find(g => g.findForSubject(obs) != null);
      if (match) {
        return match.findForSubject(obs);
      }
    }
    return null;
  }

  public before(record: ICallRecord, parents?: ICallRecord[]): this {
    switch (callRecordType(record)) {
      case "setup":
        if (parents && parents.length > 0) {
          var parent = this.findNode(parents[parents.length - 1])
          if (parent) return parent.createSubGraph().before(record) as this;
        }
        let stack = ErrorStackParser.parse(record).slice(1, 2)[0];
        let nid = stack.source;
        let node = this.lookup[nid];
        if (typeof node == 'undefined') {
          this.lookup[nid] = node = new RxFiddleNode("" + Visualizer._nextId++, record.method, stack);
        }
        return this;
      case "subscribe":
      case "event":
        return this.findForSubject(record.subject) as this || this;
    }
    return this;
  }

  public after(record: ICallRecord) {
    if (record.subject[HASH] == 25 && record.method == "_subscribe") {
      debugger;
    }
    var stack = ErrorStackParser.parse(record).slice(1, 2)[0];

    switch (callRecordType(record)) {
      case "setup":
        this.logSetup(
          record.subjectName === "Observable.prototype" ?
            record.subject :
            record.subject.source,
          record.returned,
          [record.method, stack]);
        break;

      case "subscribe":
        let observer = typeof record.arguments[0] == 'object' ? record.arguments[0] as Rx.Observer<any> : record.returned;
        if (record.subject) {
          this.logSubscribe(record.subject, observer, observer.source || observer.parent);
        }
      // fallthrough on purpose
      case "event":
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
      console.log("Handle in internal graph", node);
      var newNode = RxFiddleNode.wrap(node, this.observableLookup[Visualizer.id(to)]);
      return node;
    } else {
      this.observableLookup[Visualizer.id(to)] = node;
    }

    // Store references
    this.g.setNode(node.id, node);

    this.unrendered += 1;

    // No edges for ObservableStatic method calls
    if (onto == null) return node;

    let rootNode = this.observableLookup[Visualizer.id(onto)];

    if (typeof rootNode !== "undefined") {
      let edge = new RxFiddleEdge(rootNode, node);
      this.g.setEdge(edge.from.id, edge.to.id, edge);
    }

    return node;
  }

  public logSubscribe(on: Rx.Observable<any>, observer: Rx.Observer<any>, destination?: Rx.Observable<any>) {
    let node = this.observableLookup[Visualizer.id(on)]
    if (node) {
      this.observerLookup[Visualizer.id(observer)] = node.addObserver(on, observer);
      this.unrendered += 1;
    }
  }

  public logEvent(observer: Rx.Observer<any>, event: IEvent) {
    if (Visualizer.id(observer) in this.observerLookup) {
      let [_1, _2, events] = this.observerLookup[Visualizer.id(observer)];
      events.push(event);
    }
    this.unrendered += 1;
  }

  public logLink(root: Rx.Observable<any>, child: Rx.Observable<any>) {
    console.log(root, child);
    if (Visualizer.id(root) in this.observableLookup && Visualizer.id(child) in this.observableLookup) {
      console.log("found");
      let edge = new RxFiddleEdge(this.observableLookup[Visualizer.id(child)], this.observableLookup[Visualizer.id(root)], { dashed: true });
      this.g.setEdge(edge.from.id, edge.to.id, edge);
    } else {
      var rootGraph = this.findForSubject(root);
      if (!rootGraph) return console.warn("no rootGraph", this, root);
      var rootNode = rootGraph.observableLookup[Visualizer.id(root)];
      var childGraph = this.findForSubject(child);
      if (!childGraph) return console.warn("no childGraph");;
      console.log("migrating", root, child)
      rootNode.migrate(child, childGraph.observableLookup[Visualizer.id(child)]);
    }
  }

  public wrapHigherOrder(subject: Rx.Observable<any>, fn: Function | any): Function | any {
    var self = this;
    if (typeof fn === "function") {
      return function wrapper(val: any, id: any, subjectSuspect: rx.Observable<any>) {
        var result = fn.apply(this, arguments);
        if (typeof result == 'object' && isStream(result)) {
          subjectSuspect && self.logLink(subjectSuspect, result);
        }
        return result;
      }
    }
    return fn;
  }

  public nodes(): RxFiddleNode[] {
    return Object.keys(this.lookup)
      .map(key => this.lookup[key])
  }

  public subGraphs(): Visualizer[] {
    return this.nodes()
      .map(n => n.subGraph())
      .filter(n => n && n !== this)
  }

  public recuriveUnrendered(): number {
    return this.unrendered + this.subGraphs().reduce(
      (p, g) => p + g.recuriveUnrendered(), 0
    );
  }

  public layout() {
    this.nodes().forEach(n => n.layout());
    dagre.layout(this.g);
  }

  public size(): { w: number, h: number } {
    if (this.nodes().length == 0) {
      return { w: 0, h: 0 };
    }
    let g = this.g.graph();
    this.layout();
    return { w: g.width, h: g.height };
  }

  public render(): VNode {
    this.unrendered = 0;
    this.layout();
    if (this.g.nodes().length == 0) {
      return h("g");
    }

    let ns = this.g.nodes().map((id: string) => this.g.node(id).render(patch)).reduce((p, c) => p.concat(c), []);
    let es = this.g.edges().map((e: Dagre.Edge) => {
      let edge = this.g.edge(e);
      return edge.render();
    });
    let childs = es.concat(ns);
    let graph = this.g.graph();

    return h("g", { attrs: { class: "visualizer" } }, childs);
  }

  public run() {
    this.unrendered = 0;
    if (this.svg instanceof HTMLElement) {
      this.svg.innerHTML = "";
    }

    let graph = this.g.graph();
    let render = this.render();
    let updated = h("svg", {
      attrs: {
        id: "svg",
        style: "width: 100vw; height: 100vh",
        version: "1.1",
        viewBox: `0 0 ${graph.width} ${graph.height}`,
        xmlns: "http://www.w3.org/2000/svg",
      },
    }, [render]);
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
    if (this.recuriveUnrendered() === 0) {
      return;
    }
    this.run();
  }
}
