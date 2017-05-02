import * as Rx from "rxjs"
import h from "snabbdom/h"
import { VNode } from "snabbdom/vnode"

export default class Splash {
  public stream(): Rx.Observable<VNode> {
    return new Rx.Observable<VNode>(subscriber => {
      let debugOptions: VNode[] = [
        h("span.separator", "or"),
        h("label.launchOption", [
          h("span", "Static Demos"),
          h("div", { attrs: { style: "display: flex" } }, [
            h("a", { attrs: { class: "btn", href: "#source=dist/tree_rxfiddle.json&type=demo" } }, "A"), " ",
            h("a", { attrs: { class: "btn", href: "#source=dist/tree_b.json&type=demo" } }, "B"), " ",
            h("a", { attrs: { class: "btn", href: "#source=dist/tree_c.json&type=demo" } }, "C"), " ",
            h("a", { attrs: { class: "btn", href: "#source=dist/tree_d.json&type=demo" } }, "D"), " ",
            h("a", { attrs: { class: "btn", href: "#source=dist/tree_e.json&type=demo" } }, "E"), " ",
            h("a", { attrs: { class: "btn", href: "#source=dist/tree_f.json&type=demo" } }, "F"), " ",
          ] as Array<VNode>),
        ]),
      ]

      let vnode = h("div", { attrs: { class: "splash " } }, [h("div", { attrs: { class: "welcome" } }, [
        h("h1", [h("img", { attrs: { alt: "ReactiveX", src: "images/RxLogo.png" } }), "RxFiddle"]),
        h("h2", ["Visualize your Observables."]),

        h("p", ["Select an input:"]),

        h("label.launchOption", [
          h("span", "In-browser editor"),
          h("a.btn", { attrs: { href: "#type=editor" } }, "Start Editor"),
        ]),

        h("span.separator", "or"),

        h("label.launchOption", [
          h("span", "WebSocket debugger"),
          h("form", { attrs: { method: "get", style: "display: flex" } }, [
            h("div.inputbar", [
              h("input", { attrs: { placeholder: "url, e.g. ws://localhost:1337", type: "text" } }),
            ]),
            h("button.btn", "Connect"),
          ]),
        ]),

        /* Not yet supported JSON load
        h("span.separator", "or"),

        h("label.launchOption", [
          h("span", "Import"),
          h("form", { attrs: { method: "get", style: "display: flex" } }, [
            h("div", [h("label.btn.rel", [
              h("input", { attrs: { type: "file" } }), h("span", "Load a JSON log file")]),
            ]),
          ]),
        ]),
        */

        ...debugOptions,
      ])])
      subscriber.next(vnode)
    })
  }
}
