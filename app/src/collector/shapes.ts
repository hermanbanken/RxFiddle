import * as snabbdom from "snabbdom";
const h = require("snabbdom/h");

export function centeredRect(width: number, height: number, opts: any = {}): VNode {
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

export function centeredText(text: string, opts: any = {}): VNode {
  return h("text", {
    attrs: Object.assign({
      x: 0,
      y: 0,
      "text-anchor": "middle",
      "alignment-baseline": "middle",
    }, opts),
  }, text);
}