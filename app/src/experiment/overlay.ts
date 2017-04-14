// tslint:disable:object-literal-sort-keys
import h from "snabbdom/h"
import { VNode } from "snabbdom/vnode"

function defs() {
  return h("defs",
    h("marker#arrow",
      {
        attrs: {
          markerWidth: "4", markerHeight: "10",
          refX: "3", refY: "3",
          orient: "auto", markerUnits: "strokeWidth",
          viewBox: "0 0 20 20",
        },
      },
      [h("path", { attrs: { d: "M0,0 L0,6 L7,3 z", fill: "white" } })]))
}

/* Overlay tool with lines pointing to UI elements with explanation */
export default function overlay(): VNode {
  return h("div.overlay.help", [h("svg", {
    attrs: { viewPort: "0 0 800 270" },
    style: { width: "800", height: "270", left: "80px", top: "15px", position: "relative" },
  }, [
      defs(),
      h("path", {
        attrs: {
          d: "M47,200 C-40,197 118,16 26,12",
          "marker-end": "url(#arrow)",
        },
      }),
      h("text", { attrs: { x: 60, y: 207 } }, "Click to execute the code that is in the editor"),
    ]), h("svg", {
      attrs: { viewPort: "0 0 800 270" },
      style: { width: "800", height: "270", right: "0px", top: "40px", position: "absolute" },
    }, [
        defs(),
        h("path", {
          attrs: {
            d: "M553,220 C690,207 704,112 704,12",
            "marker-end": "url(#arrow)",
          },
        }),
        h("path", {
          attrs: {
            d: "M553,220 C690,207 574,112 574,12",
            "marker-end": "url(#arrow)",
          },
        }),
        h("text", { attrs: { x: 540, y: 227, "text-anchor": "end" } }, "Feel free to use these references"),
      ]),
  ])
}
