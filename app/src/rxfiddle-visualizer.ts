import "./utils";
import * as dagre from "dagre";
import * as snabbdom from "snabbdom";

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

export class Visualizer {
  private g = new dagre.graphlib.Graph();
  private unrendered: number = 0;
  private svg: HTMLElement;

  constructor() {
    this.g.setGraph({});
    this.g.setDefaultEdgeLabel(() => ({}));
  }
  public log(record: ICallRecord) {
    this.unrendered += 1;
    if (record.subject[HASH]) {
      console.log("Reuse")
    } else if (typeof record.subject[IGNORE] === "undefined") {
      this.tag(record.subject);
    } else {
      record.subject = {};
      this.tag(record.subject, record.subjectName);
    }

    let operator = this.operator(record.method);
    this.g.setEdge(record.subject[HASH], operator);

    if (typeof record.returned === "object") {
      this.tag(record.returned);
    }

    this.g.setEdge(operator, record.returned[HASH]);
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
      let label = node.label;
      delete node.label;
      // console.log("Node " + v + ": " + JSON.stringify(this.g.node(v)));
      return h("g", { attrs: { transform: `translate(${node.x},${node.y})` } }, node.render());
    });

    let es = this.g.edges().map((e: Dagre.Edge) => {
      let edge = this.g.edge(e);
      let path = "M " + edge.points.map((p: { x: number, y: number }) => `${p.x} ${p.y}`).join(" L ");
      let attrs = { d: path, fill: "transparent", "stroke-width": "5", stroke: "red" };
      return h("path", { attrs });
      // console.log("Edge " + e.v + " -> " + e.w + ": " + JSON.stringify(this.g.edge(e)));
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
    let instance = svgPanZoom("#svg");
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
          h("rect", {
            attrs: {
              fill: "transparent",
              height: 30,
              stroke: "black",
              "stroke-width": 2,
              width: 100,
              x: -100 / 2,
              y: -30 / 2,
              rx: 10,
              ry: 10,
            },
          }),
          h("text", {
            attrs: {
              x: 0,
              y: 0,
              "text-anchor": "middle",
              "alignment-baseline": "middle",
            },
          }, name),
        ];
      },
    });
    return id;
  }

  private tag(subject: any, subjectName: string = null) {
    if (typeof subject[HASH] !== "undefined") {
      return;
    }

    subject[HASH] = performance.now();
    this.g.setNode(subject[HASH], {
      width: 100,
      height: 30,
      render: () => {
        return [
          h("rect", {
            attrs: {
              fill: "transparent",
              height: 30,
              stroke: "black",
              "stroke-width": 2,
              width: 100,
              x: -100 / 2,
              y: -30 / 2,
            },
          }),
          h("text", {
            attrs: {
              x: 0,
              y: 0,
              "text-anchor": "middle",
              "alignment-baseline": "middle",
            },
          }, subjectName || subject.getName()),
        ];
      },
    });
  }
}
