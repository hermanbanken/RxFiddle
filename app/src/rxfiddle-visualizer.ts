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
  public observers: [Rx.Observable<any>, Rx.Observer<any>, any[]][] = [];
  constructor(
    public id: string,
    public name: string,
    public location: StackFrame
  ) { }
  public add(instance: Rx.Observable<any>) {
    this.instances.push(instance)
    return this
  }
  public addObserver(observable: Rx.Observable<any>, observer: Rx.Observer<any>): [Rx.Observable<any>, Rx.Observer<any>, any[]] {
    let tuple: [Rx.Observable<any>, Rx.Observer<any>, any[]] = [observable, observer, []]
    this.observers.push(tuple)
    return tuple
  }

  public width = 100;
  public height = 30;
  public x: number;
  public y: number;

  public render() {
    return h("g", { attrs: { transform: `translate(${this.x},${this.y})` } }, [
      centeredRect(100, 30, { rx: 10, ry: 10 }),
      centeredText(this.name),
    ]);
  }
}

export class RxFiddleEdge {
  public points: { x: number, y: number }[] = [];

  constructor(public from: RxFiddleNode, public to: RxFiddleNode) { }

  public render() {
    let path = "M " + this.points.map((p: { x: number, y: number }) => `${p.x} ${p.y}`).join(" L ");
    let attrs = { d: path, fill: "transparent", "stroke-width": "5", stroke: "red" };
    return h("path", { attrs });
  }
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
  private observerLookup: { [hash: string]: [Rx.Observable<any>, Rx.Observer<any>, any[]] } = {};

  private static _nextId = 0;
  public static id(obs: Rx.Observable<any> | Rx.Observer<any>): string {
    if (typeof (<any>obs)[HASH] == "undefined") {
      (<any>obs)[HASH] = this._nextId++;
    }
    return (<any>obs)[HASH];
  }

  public log(record: ICallRecord) {
    var stack = ErrorStackParser.parse(record).slice(1, 2)[0];

    if (record.subjectName === "Observable" || record.subjectName === "Observable.prototype") {
      if (record.method === "subscribe") {
        let observer = record.arguments[0] as Rx.Observer<any>;
        if (observer.source && record.subject) {
          this.logSubscribe(record.subject, observer, observer.source);
        }
        return;
      }

      this.logSetup(record.subjectName === "Observable.prototype" ? record.subject : null, record.returned, [record.method, stack]);
    } else {
      this.logEvent(record.subject, record.method, record.arguments[0])
    }
  }

  public logSetup(onto: Rx.Observable<any> | null, to: Rx.Observable<any>, using: [MethodName, StackFrame]) {
    let nid = using[1].source,
      node = this.lookup[nid];
    if (typeof node == 'undefined') {
      this.lookup[nid] = node = new RxFiddleNode("" + Visualizer._nextId++, using[0], using[1]);
      this.g.setNode(node.id, node);
    }

    node.add(to);
    this.observableLookup[Visualizer.id(to)] = node;

    if (onto != null && typeof this.observableLookup[Visualizer.id(onto)] !== "undefined") {
      let edge = new RxFiddleEdge(this.observableLookup[Visualizer.id(onto)], node);
      this.g.setEdge(edge.from.id, edge.to.id, edge);
    }
    this.unrendered += 1;
  }

  public logSubscribe(on: Rx.Observable<any>, observer: Rx.Observer<any>, to?: Rx.Observable<any>) {
    let node = this.observableLookup[Visualizer.id(on)]
    this.observerLookup[Visualizer.id(observer)] = node.addObserver(on, observer);
    this.unrendered += 1;
  }

  public logEvent(observer: Rx.Observer<any>, event: string, value: any) {
    let tuple = this.observerLookup[Visualizer.id(observer)];
    if (typeof tuple != "undefined") {
      tuple[2].push(event);
    }
    this.unrendered += 1;
  }

  public render() {
    let ns = this.g.nodes().map((id: string) => this.g.node(id).render()).reduce((p, c) => p.concat(c), []);
    let es = this.g.edges().map((e: Dagre.Edge) => {
      let edge = this.g.edge(e);
      return edge.render();
    });
    let childs = ns.concat(es);
    console.log(childs);
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
    if (this.unrendered === 0) {
      return;
    }
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
    this.run();
    window.requestAnimationFrame(() => this.step());
  }
}
