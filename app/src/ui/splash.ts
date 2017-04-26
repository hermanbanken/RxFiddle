import { SnippetDict, snippets, Snippet } from "../firebase"
import { Observable } from "rxjs"
import h from "snabbdom/h"
import { VNode } from "snabbdom/vnode"

let debugOptions: VNode[] = [
  h("span.separator", "or"),
  h("label.launchOption", [
    h("span", "Static Demos"),
    h("div", { attrs: { style: "display: flex" } }, [
      h("a", { attrs: { class: "btn", href: "#source=dist/tree_a.json&type=demo" } }, "A"), " ",
      h("a", { attrs: { class: "btn", href: "#source=dist/tree_b.json&type=demo" } }, "B"), " ",
      h("a", { attrs: { class: "btn", href: "#source=dist/tree_c.json&type=demo" } }, "C"), " ",
      h("a", { attrs: { class: "btn", href: "#source=dist/tree_d.json&type=demo" } }, "D"), " ",
      h("a", { attrs: { class: "btn", href: "#source=dist/tree_e.json&type=demo" } }, "E"), " ",
      h("a", { attrs: { class: "btn", href: "#source=dist/tree_f.json&type=demo" } }, "F"), " ",
    ] as Array<VNode>),
  ]),
]

let brand = [
  h("h1", [h("img", { attrs: { alt: "ReactiveX", src: "images/RxLogo.png" } }), "RxFiddle"]),
  h("h2", ["Visualize your Observables."]),
]

let editor = h("label.launchOption", [
  h("span", "In-browser editor"),
  h("a.btn", { attrs: { href: "#type=editor" } }, "Start Editor"),
])

let inputs = [
  h("p.launchOption", ["Select an input:"]),

  h("span.separator", " "),

  h("p", [`Write RxJS code in your browser and see the data flow.`]),

  editor,

  h("span.separator", "or"),

  h("p", [`Connect any running Rx process by using a collector and attach 
          the WebSocket debugger. `]),

  h("p", [`This is a work in progress. You can help by creating collectors 
          for the JVM, Swift, .NET, Chrome DevTools, etc.`]),

  h("label.launchOption", { style: { cursor: "not-allowed", opacity: 0.3 } }, [
    h("span", "WebSocket debugger"),
    h("form", { attrs: { method: "get", style: "display: flex; pointer-events: none" } }, [
      h("div.inputbar", [
        h("input", {
          attrs: { placeholder: "url, e.g. ws://localhost:1337", type: "text" },
        }),
      ]),
      h("button.btn", "Connect"),
    ]),
  ]),

  h("span.separator", "or"),

  /* Not yet supported JSON load 
  h("label.launchOption", [
    h("span", "Import"),
    h("form", { attrs: { method: "get", style: "display: flex" } }, [
      h("div", [h("label.btn.rel", [
        h("input", { attrs: { type: "file" } }), h("span", "Load a JSON log file")]),
      ]),
    ]),
  ]),
  */

  // ...debugOptions,
]

export default class Splash {
  public stream() {
    return Observable.combineLatest(
      Observable.of({ inputs }),
      snippets.latest().throttleTime(5000).startWith({} as SnippetDict),
      snippets.user().startWith({} as SnippetDict),
      (staticContent, snippets: SnippetDict, mySnippets: SnippetDict) => {
        return h("div", { attrs: { class: "splash " } }, [h("div", { attrs: { class: "welcome" } }, [
          ...brand,
          ...staticContent.inputs,
          h("h3", ["Shared samples"]),
          h("div.snippets", Object.keys(snippets).filter(key => validSnippet(snippets[key]))
            .map(key => h("div.snippet", [
              h("a",
                { attrs: { href: `#type=editor&code=${btoa(snippets[key].code)}` } },
                snippets[key].name
              ),
              h("div", snippets[key].description),
            ]))
          ),
          h("h3", ["My samples"]),
          h("div.snippets", Object.keys(mySnippets).filter(key => validSnippet(mySnippets[key]))
            .map(key => h("div.snippet", [
              h("a",
                { attrs: { href: `#type=editor&code=${btoa(snippets[key].code)}` } },
                snippets[key].name
              ),
              h("div", snippets[key].description),
            ]))
          ),
        ])])
      })
  }
}

function validSnippet(snippet: any): snippet is Snippet {
  return typeof snippet === "object" && "name" in snippet && "description" in snippet && "code" in snippet
}
