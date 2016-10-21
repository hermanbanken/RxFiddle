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
  logSetup(from: Rx.Observable<any> | Rx.ObservableStatic, to: Rx.Observable<any>, using: [MethodName, StackFrame]): RxFiddleNode
  logSubscribe(on: Rx.Observable<any>, observer: Rx.Observer<any>, destination?: Rx.Observable<any>): void
  logEvent(observer: Rx.Observer<any>, event: IEvent): void
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

  private queue: ICallRecord[] = [];
  private static subtree: { [id: number]: Visualizer } = {};

  public findNode(stackSource: string): RxFiddleNode {
    if (typeof this.lookup[stackSource] !== "undefined") {
      return this.lookup[stackSource];
    } else {
      var match = Object.keys(this.lookup)
        .filter(key => this.lookup[key].subGraph() !== this)
        .find(key => this.lookup[key].subGraph().findNode(stackSource) != null);
      if (match) {
        this.lookup[match].subGraph().findNode(stackSource);
      }
    }
    return null;
  }

  public before(record: ICallRecord): Visualizer {
    switch (callRecordType(record)) {
      case "setup":
        let stack = ErrorStackParser.parse(record).slice(1, 2)[0];
        let nid = stack.source;
        let node = this.lookup[nid];
        if (record.parent) {
          var parent = this.findNode(stack.source)
          if (parent) return parent.subGraph();
        }
        if (typeof node == 'undefined') {
          this.lookup[nid] = node = new RxFiddleNode("" + Visualizer._nextId++, record.method, stack);
          console.log(node);
          return this;
        }
        return node.subGraph();
      case "subscribe":
      case "event": break;
    }
    return this;
  }

  public log(record: ICallRecord) {
    // if (record.parent) {
    //   console.log("with parent", record);
    // }
    this._log(record);
  }

  public _log(record: ICallRecord, reintroduce = false) {
    // Trampoline nested calls
    // if (record.id)
    //   if (record.parent && !reintroduce) {
    //     this.queue.push(record);
    //     return;
    //   }

    var stack = ErrorStackParser.parse(record).slice(1, 2)[0];

    switch (callRecordType(record)) {
      case "setup":
        let node = this.logSetup(
          record.subjectName === "Observable.prototype" ?
            record.subject :
            record.subject.source,
          record.returned,
          [record.method, stack]);
        // Run nested calls trampoline
        // while (this.queue.length) {
        //   var top = this.queue.pop();
        //   node.subGraph().log(top);
        // }
        break;

      case "subscribe":
        let observer = typeof record.arguments[0] == 'object' ? record.arguments[0] as Rx.Observer<any> : record.returned;
        if (record.subject) {
          this.logSubscribe(record.subject, observer, observer.source || observer.parent);
        }
        break;

      case "event":
        this.logEvent(record.subject, Event.fromRecord(record))
    }

    // Run nested calls trampoline
    // while (this.queue.length) {
    //   var top = this.queue.shift();
    //   this.log(top);
    // }
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

    if (using[0] == "asObservable" || using[0] == "multicast" || using[0] == "publish") {
      console.log("Not handling internally", node, rootNode);
      // this.run();
      // debugger;
    }

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
    let tuple = this.observerLookup[Visualizer.id(observer)];
    if (typeof tuple != "undefined") {
      tuple[2].push(event);
    }
    this.unrendered += 1;
  }

  public subGraphs(): Visualizer[] {
    return Object.keys(this.lookup)
      .map(key => this.lookup[key])
      .filter(r => r.subGraph() !== this)
      .map(r => r.subGraph())
  }

  public render(): VNode {
    this.layout();
    let subs = this.subGraphs()
      .map(r => r.render())
      .filter(s => s);

    if (this.g.nodes().length == 0) {
      return subs.length && h("g", subs);
    }

    let ns = this.g.nodes().map((id: string) => this.g.node(id).render(patch)).reduce((p, c) => p.concat(c), []);
    let es = this.g.edges().map((e: Dagre.Edge) => {
      let edge = this.g.edge(e);
      return edge.render();
    });
    let childs = ns.concat(es).concat(subs);
    let graph = this.g.graph();

    return h("g", { attrs: { class: "visualizer" } }, childs);
  }

  public layout() {
    this.subGraphs().forEach(g => g.layout());
    dagre.layout(this.g);
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
    var subs = Object.keys(this.lookup).map(key => this.lookup[key]).reduce((p, r) => {
      return p + r.subGraph().unrendered;
    }, 0);
    if (this.unrendered + subs === 0) {
      return;
    }
    this.run();
  }
}
