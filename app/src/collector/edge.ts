import * as snabbdom from "snabbdom";
import { RxFiddleNode } from "./node";
const h = require("snabbdom/h");

export interface IOptions {
  fill?: string,
  dashed?: boolean,
  stroke?: string,
  "stroke-width"?: number,
  "marker-end"?: string,
  "marker-start"?: string,
}

export class RxFiddleEdge {
  public points: { x: number, y: number }[] = []
  public options: IOptions

  constructor(public from: RxFiddleNode, public to: RxFiddleNode, options: IOptions = {}) {
    this.options = Object.assign({
      dashed: false,
      fill: "transparent",
      stroke: "black",
      "stroke-width": 2,
    }, options)
  }

  public render() {
    let path = qubicPath(this.points)
    let attrs: any = Object.assign({
      d: path,
    }, this.options)
    if (attrs.dashed) {
      attrs["stroke-dasharray"] = "5, 5"
    }
    delete attrs.dashed
    return h("path", { attrs })
  }
}

function qubicPath(points: { x: number, y: number }[]): string {
  if (points.length % 2 === 1) {
    let path = `M ${points[0].x} ${points[0].y}`
    for (let i = 1; i < points.length; i += 2) {
      path += `Q ${points[i].x} ${points[i].y}, ${points[i + 1].x} ${points[i + 1].y}`
    }
    return path
  } else {
    return "M " + points.map((p: { x: number, y: number }) => `${p.x} ${p.y}`).join(" T ")
  }
}