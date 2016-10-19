import "./utils";
import * as rx from "rx";
import * as dagre from "dagre";
import * as snabbdom from "snabbdom";
import { VNode } from "snabbdom";

// import * as ErrorStackParser from "error-stack-parser";

const ErrorStackParser = require("error-stack-parser");
const h = require("snabbdom/h");
const moduleAttrs = require("snabbdom/modules/attributes");
const patch = snabbdom.init([moduleAttrs]);
const svgPanZoom = require("svg-pan-zoom");

export const HASH = "__hash";
export const IGNORE = "__ignore";

export interface ICallRecord {
  id: number | string | null;
  subject: any;
  subjectName: string;
  method: string;
  arguments: any[];
  stack: StackFrame | string;
  time: number;
  returned: any | null;
}

function centeredRect(width: number, height: number, opts: any = {}): VNode {
  return h("rect", {
    attrs: Object.assign({
      fill: "transparent",
      stroke: "black",
      "stroke-width": 2,
      width,
      height,
      x: -width / 2,
      y: -height / 2,
    }, opts),
  });
}
function centeredText(text: string, opts: any = {}): VNode {
  return h("text", {
    attrs: Object.assign({
      x: 0,
      y: 0,
      "text-anchor": "middle",
      "alignment-baseline": "middle",
    }, opts),
  }, text);
}


const inst_method = "instrumented";
const inst_file = "rxfiddle-collector.js";

function endsWith(self: string, suffix: string): boolean {
  return self.indexOf(suffix, self.length - suffix.length) !== -1;
};

// class Identification { 
//   constructor(public id: string, public frame: StackFrame) { }
// }
// class Thing {
//   constructor(public result: any) { }
// }

type Identification = string;
type Result = any;

type Methods = "of" | "map" | "flatMap" | "groupBy" | "merge" | "startWith";

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
  logSubscribe(on: Rx.Observable<any>, observer: Rx.Observer<any>, to?: Rx.Observable<any>): void
  logEvent(observer: Rx.Observer<any>, event: string, value: any): void
}

export class RxFiddleNode {
  public instances: Rx.Observable<any>[] = [];
  public observers: [Rx.Observable<any>, Rx.Observer<any>][] = [];
  constructor(
    public id: string,
    public name: string,
    public location: StackFrame
  ) { }
  public add(instance: Rx.Observable<any>) {
    this.instances.push(instance)
    return this
  }
  public addObserver(observable: Rx.Observable<any>, observer: Rx.Observer<any>): [Rx.Observable<any>, Rx.Observer<any>] {
    let tuple: [Rx.Observable<any>, Rx.Observer<any>] = [observable, observer]
    this.observers.push(tuple)
    return tuple
  }
}

export class RxFiddleEdge {
  constructor(public from: RxFiddleNode, public to: RxFiddleNode) { }
}

export class RxVisualizer implements RxCollector {

  private g = new dagre.graphlib.Graph({ compound: true, multigraph: true });
  private svg: HTMLElement;
  private unrendered: number = 0;

  constructor() {
    this.g.setGraph({});
    this.g.setDefaultEdgeLabel(() => ({}));
  }

  // new 
  private lookup: { [stackframe: string]: RxFiddleNode } = {};
  private observableLookup: { [hash: string]: RxFiddleNode } = {};
  private observerLookup: { [hash: string]: [Rx.Observable<any>, Rx.Observer<any>] } = {};

  // old
  private creationLookup: { [id: string]: [MethodName, StackFrame] } = {};
  private observerObervableLookup: { [id: string]: Rx.Observable<any> } = {};
  private obervableObservers: { [id: string]: Rx.Observer<any>[] } = {};
  private observers: { [id: string]: Rx.Observable<any> } = {};
  private events: { [id: string]: any[] } = {};

  private static _nextId = 0;
  public static id(obs: Rx.Observable<any> | Rx.Observer<any>): string {
    if (typeof (<any>obs)[HASH] == "undefined") {
      (<any>obs)[HASH] = this._nextId++;
    }
    return (<any>obs)[HASH];
  }

  public logSetup(onto: Rx.Observable<any> | null, to: Rx.Observable<any>, using: [MethodName, StackFrame]) {

    let nid = using[1].source,
      node = this.lookup[nid];
    if (typeof node == 'undefined') {
      this.lookup[nid] = node = new RxFiddleNode("" + RxVisualizer._nextId++, using[0], using[1]);
      this.g.setNode(node.id, node);
    }

    node.add(to);
    this.observableLookup[RxVisualizer.id(to)] = node;

    if (onto != null && typeof this.observableLookup[RxVisualizer.id(onto)] !== "undefined") {
      let edge = new RxFiddleEdge(this.observableLookup[RxVisualizer.id(onto)], node);
      this.g.setEdge(edge.from.id, edge.to.id, edge);
    }

    // Old
    this.creationLookup[RxVisualizer.id(to)] = using;
    console.log("setup", using[0], onto, to, using[1]);
  }

  public logSubscribe(on: Rx.Observable<any>, observer: Rx.Observer<any>, to?: Rx.Observable<any>) {

    let node = this.observableLookup[RxVisualizer.id(on)]
    this.observerLookup[RxVisualizer.id(observer)] = node.addObserver(on, observer)

    // Old
    this.observerObervableLookup[RxVisualizer.id(observer)] = on;
    if (typeof to != "undefined") {
    }
    this.events[RxVisualizer.id(observer)] = [];
    console.log("subscribe", on, observer, to);
    if (observer.o) {
      this.events[RxVisualizer.id(observer.o)] = [];
      console.log("inner subscription");
    }
  }

  public logEvent(observer: Rx.Observer<any>, event: string, value: any) {
    if (typeof this.events[RxVisualizer.id(observer)] != 'undefined') {
      this.events[RxVisualizer.id(observer)].push(event);
      console.log("event", event, value, observer);
    } else {
      console.log("observer not in lookup", observer, event, value);
    }
  }

}

export class Visualizer {

  private static isNotRxFiddle(frame: any): boolean {
    return frame.functionName !== inst_method || !endsWith(frame.fileName, inst_file);
  }

  private g = new dagre.graphlib.Graph({ compound: true, multigraph: true });
  private unrendered: number = 0;
  private svg: HTMLElement;

  private stackLookup: { [id: string]: StackFrame } = {};
  private structure: { [id: string]: { operator: any, result: Result } } = {};
  private hashLookup: { [hash: string]: { thing: Result } } = {};

  constructor() {
    this.g.setGraph({});
    this.g.setDefaultEdgeLabel(() => ({}));
  }

  public id(record: ICallRecord): string {
    let last = ErrorStackParser.parse(record).slice(1, 2)[0];
    let id = record.subjectName + "." + record.method + last.source;
    return id;
  }

  private collector: RxVisualizer = new RxVisualizer();

  public log(record: ICallRecord) {
    var stack = ErrorStackParser.parse(record).slice(1, 2)[0];
    record.stack = stack;

    if (record.subjectName === "Observable" || record.subjectName === "Observable.prototype") {
      if (record.method === "subscribe") {
        let observer = record.arguments[0] as Rx.Observer<any>;
        if (observer.source && record.subject) {
          // Keep:
          this.collector.logSubscribe(record.subject, observer, observer.source);
        }
        return;
      }

      let subject = record.subjectName === "Observable" ? {} : record.subject;
      this.addNode(subject, record.subject.getName() === "Function" ? record.subjectName : record.subject.getName());
      this.addNode(record.returned);
      this.link(subject, record.method, stack, record.returned);

      // Keep:
      this.collector.logSetup(record.subjectName === "Observable.prototype" ? record.subject : null, record.returned, [record.method, stack]);
    } else {
      // Keep:
      this.collector.logEvent(record.subject, record.method, record.arguments[0])
    }

    // if (record.subjectName === "Observable" || record.subjectName === "Observable.prototype") {
    //   // let id = this.id(record);
    //   this.tag(record.subject);
    //   this.tag(record.returned);

    //   // Something used as Subject before it comes by as Result
    //   // Something used as Result, later as Subject
    //   this.addNode(record.subject, record.subjectName);
    //   this.addNode(record.returned);
    //   this.g.setNode(record.stack.source, { height: 1, width: 1, render: () => h("text", record.stack.functionName) });
    //   this.g.setParent(record.returned[HASH], record.stack.source);
    //   this.link(record.subject, record.method, record.stack, record.returned);

    //   // this.createdByLookup[record.returned[HASH]] = id;
    //   // this.addStructure(id, record.method, record.returned.getName());

    //   // if (typeof this.createdByLookup[record.subject[HASH]] !== "undefined") {
    //   //   this.g.setEdge(this.createdByLookup[record.subject[HASH]], id);
    //   // }
    // }

    this.unrendered += 1;
    return;

    // if (!record.subject[HASH]) {
    //   if (typeof record.subject[IGNORE] === "undefined") {
    //     this.addNode(record.subject);
    //   } else {
    //     record.subject = {};
    //     this.addNode(record.subject, record.subjectName);
    //   }
    // }

    // if (typeof record.returned !== "undefined") {
    //   let operator = this.operator(record.method);
    //   this.g.setEdge(record.subject[HASH], operator);

    //   this.addNode(record.returned);
    //   this.g.setEdge(operator, record.returned[HASH]);
    // }
  }
  public run() {
    if (this.unrendered === 0) {
      return;
    }
    this.unrendered = 0;
    dagre.layout(this.g);
    this.svg.innerHTML = "";
    let ns = this.g.nodes().map((v: string) => {
      let node = this.g.node(v);
      if (!node) { throw new Error("No node for " + node); }
      return h("g", { attrs: { transform: `translate(${node.x},${node.y})` } }, node.render());
    }).filter(n => n);

    let es = this.g.edges().map((e: Dagre.Edge) => {
      let edge = this.g.edge(e);
      let path = "M " + edge.points.map((p: { x: number, y: number }) => `${p.x} ${p.y}`).join(" L ");
      let attrs = { d: path, fill: "transparent", "stroke-width": "5", stroke: "red" };
      return h("path", { attrs });
    });

    let childs = ns.concat(es).reduce((chunks, next, i) => {
      if (i % 50 === 0) { chunks.push([]); }
      chunks[chunks.length - 1].push(next);
      return chunks;
    }, []).map((chunk: snabbdom.VNode[]) => h("g", chunk));

    let graph = this.g.graph();
    let updated = h("svg", {
      attrs: {
        id: "svg",
        style: "width: 100vw; height: 100vh",
        version: "1.1",
        viewBox: `0 0 ${graph.width} ${graph.height}`,
        xmlns: "http://www.w3.org/2000/svg",
      },
    }, childs);

    patch(this.svg, updated);
    this.svg = updated;
    let instance = svgPanZoom("#svg", { maxZoom: 30 });
  }
  public attach(node: HTMLElement) {
    this.svg = node;
    this.step();
  }
  public step() {
    this.run();
    window.requestAnimationFrame(() => this.step());
  }

  private operator(name: string) {
    let id = performance.now().toString();
    this.g.setNode(id, {
      width: 100,
      height: 30,
      label: name,
      render: () => {
        return [
          centeredRect(100, 30, { rx: 10, ry: 10 }),
          centeredText(name),
        ];
      },
    });
    return id;
  }

  private addNode(subject: any, subjectName: string = null) {
    if (typeof subject === "undefined") {
      return;
    }
    if (typeof subject[HASH] === "undefined") {
      this.tag(subject);
    }

    this.g.setNode(subject[HASH], {
      width: 100,
      height: 30,
      render: () => {
        return [
          centeredRect(100, 30),
          centeredText(subjectName || subject.getName()),
        ];
      },
    });
  }

  private addStructure(id: string, operatorName: string, resultName: string) {
    if (typeof this.structure[id] !== "undefined") { return; }
    this.structure[id] = {
      operator: {
        height: 30,
        render: () => {
          return [
            centeredRect(100, 30, { stroke: "green", rx: 10, ry: 10 }),
            centeredText(operatorName),
          ];
        },
        width: 100,
      },
      result: {
        height: 30,
        render: () => {
          return [
            centeredRect(100, 30, { stroke: "blue" }),
            centeredText(resultName),
          ];
        },
        width: 100,
      },
    };
    this.g.setNode(id + "operator", this.structure[id].operator);
    this.g.setNode(id, this.structure[id].result);
    this.g.setEdge(id + "operator", id);
  }

  private tag(subject: any, subjectName: string = null) {
    if (typeof subject[HASH] !== "undefined") {
      return;
    }
    subject[HASH] = performance.now();
    this.hashLookup[subject[HASH]] = subject;
  }

  private link(subject: any, operator: string, stack: StackFrame, result: any): void {
    if (typeof result === "undefined") { return; }
    this.g.setNode(result[HASH] + "-creation", {
      height: 40,
      render: () => {
        return [
          centeredRect(200, 40, { stroke: "green", rx: 10, ry: 10 }),
          centeredText(operator, { y: -10 }),
          centeredText(`${stack.functionName}:${stack.lineNumber}:${stack.columnNumber}`, { y: 10 }),
        ];
      },
      width: 200,
    });

    if (typeof subject !== "undefined") {
      this.g.setEdge(subject[HASH], result[HASH] + "-creation", {}, "a" + subject[HASH] + result[HASH] + "-creation");
      this.g.setEdge(subject[HASH], result[HASH] + "-creation");
    }
    this.g.setEdge(result[HASH] + "-creation", result[HASH]);
  }
}
