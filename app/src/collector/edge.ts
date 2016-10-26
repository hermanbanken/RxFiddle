import * as snabbdom from "snabbdom";
import { RxFiddleNode } from "./node";
const h = require("snabbdom/h");

export class RxFiddleEdge {
  public points: { x: number, y: number }[] = [];

  constructor(public from: RxFiddleNode, public to: RxFiddleNode, public options?: { dashed?: boolean }) {
  }

  public render() {
    let path = "M " + this.points.map((p: { x: number, y: number }) => `${p.x} ${p.y}`).join(" L ");
    let attrs: any = {
      d: path,
      fill: "transparent",
      "stroke-width": "5",
      stroke: "red",
    };
    if (this.options && this.options.dashed) {
      attrs["stroke-dasharray"] = "5, 5";
    }
    return h("path", { attrs });
  }
}