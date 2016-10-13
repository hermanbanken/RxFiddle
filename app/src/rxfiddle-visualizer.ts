import "./utils";
import * as dagre from "dagre";
import * as snabbdom from "snabbdom";
import * as ErrorStackParser from "error-stack-parser";

const h = require("snabbdom/h");
const moduleAttrs = require("snabbdom/modules/attributes");
const patch = snabbdom.init([moduleAttrs]);
const svgPanZoom = require("svg-pan-zoom");

export const HASH = "__hash";
export const IGNORE = "__ignore";

export interface ICallRecord {
  subject: any;
  subjectName: string;
  method: string;
  arguments: any[];
  stack: string;
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


export class Visualizer {

  private static isNotRxFiddle(frame: any): boolean {
    return frame.functionName !== inst_method || !endsWith(frame.fileName, inst_file);
  }

  private g = new dagre.graphlib.Graph({ compound: true });
  private unrendered: number = 0;
  private svg: HTMLElement;

  private stackLookup: { [id: Identification]: StackFrame } = {};
  private structure: { [id: Identification]: { operator: StackFrame, result: Result } } = {};
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

  public log(record: ICallRecord) {
    record.stack = ErrorStackParser.parse(record).slice(1, 2)[0];

    if (record.subjectName === "Observable" || record.subjectName === "Observable.prototype") {
      // let id = this.id(record);
      this.tag(record.subject);
      this.tag(record.returned);

      // Something used as Subject before it comes by as Result
      // Something used as Result, later as Subject
      this.addNode(record.subject, record.subjectName);
      this.addNode(record.returned);
      this.g.setNode(record.stack.source, { height: 1, width: 1, render: () => h("text", record.stack.functionName) });
      this.g.setParent(record.returned[HASH], record.stack.source);
      this.link(record.subject, record.method, record.stack, record.returned);

      // this.createdByLookup[record.returned[HASH]] = id;
      // this.addStructure(id, record.method, record.returned.getName());

      // if (typeof this.createdByLookup[record.subject[HASH]] !== "undefined") {
      //   this.g.setEdge(this.createdByLookup[record.subject[HASH]], id);
      // }
    }

    this.unrendered += 1;
    return;

    if (!record.subject[HASH]) {
      if (typeof record.subject[IGNORE] === "undefined") {
        this.addNode(record.subject);
      } else {
        record.subject = {};
        this.addNode(record.subject, record.subjectName);
      }
    }

    if (typeof record.returned !== "undefined") {
      let operator = this.operator(record.method);
      this.g.setEdge(record.subject[HASH], operator);

      this.addNode(record.returned);
      this.g.setEdge(operator, record.returned[HASH]);
    }
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
      if (!node) { return undefined; }
      return h("g", { attrs: { transform: `translate(${node.x},${node.y})` } }, node.render());
    });

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
    let updated = h("svg#id", {
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
      this.g.setEdge(subject[HASH], result[HASH] + "-creation");
    }
    this.g.setEdge(result[HASH] + "-creation", result[HASH]);
  }
}
