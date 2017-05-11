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

let hero = h("div.hero-wrapper", [
  h("div.brand.hero", [
    h("img", { attrs: { alt: "ReactiveX", height: 100, src: "images/RxLogo.png", width: 100 } }),
    h("h1", ["RxFiddle"]),
    h("h2", ["Visualize your Observables."]),
  ]),
])

let screenshot = h("a", { attrs: { href: "#type=editor" } }, [
  h("img.screenshot", {
    attrs: {
      height: "268.84px",
      src: "https://github.com/hermanbanken/RxFiddle/raw/master/rxfiddle-js-collector/screenshot.png",
      width: "400px",
    },
  }),
])

let npm = h("svg", { attrs: { viewBox: "0 0 18 7" }, style: { display: "inline-block", width: "50%" } }, [
  h("path", { attrs: { d: "M0,0v6h5v1h4v-1h9v-6", fill: "#CB3837" } }),
  h("path", { attrs: { d: "M1,1v4h2v-3h1v3h1v-4h1v5h2v-4h1v2h-1v1h2v-4h1v4h2v-3h1v3h1v-3h1v3h1v-4", fill: "#FFF" } }),
])

let twitterIntent = `https://twitter.com/intent/tweet?text=${
  encodeURIComponent("Check out #RxFiddle for visualizing & debugging #rxjs at https://rxfiddle.net!")}`

let menu = h("div#menufold-static.menufold.flexy.wrap", [
  h("a.brand.left.flex-steady", { attrs: { href: "#" } }, [
    h("img", { attrs: { alt: "ReactiveX", src: "images/RxIconXs.png" } }),
    "RxFiddle" as any as VNode,
  ]),
  h("a.btn", { attrs: { href: "#type=editor" } }, "Editor"),
  h("a.btn", { attrs: { href: "/tutorials.html" } }, "Tutorials"),
  h("a.btn", { attrs: { href: "/experiment.html" } }, "Experiment"),
  h("div.flex-fill"),
  h("a.btn.flex-end", { attrs: { href: "https://github.com/hermanbanken/RxFiddle" } }, "Github"),
  h("a.btn.flex-end", { attrs: { href: twitterIntent } }, "Twitter"),
])

export default class Splash {
  public stream() {
    return Observable.combineLatest(
      Observable.of(0),
      snippets.latest().throttleTime(5000).startWith({} as SnippetDict),
      snippets.user().startWith({} as SnippetDict),
      (staticContent, snippets: SnippetDict, mySnippets: SnippetDict) => {
        return h("div", { attrs: { class: "splash " } }, [h("div", { attrs: { class: "welcome" } }, [
          menu,
          hero,
          h("div.warning", [
            "Experiment: \"how do you Rx\"? Part of my thesis research.",
            h("a.btn", { attrs: { href: "experiment.html" }, style: { float: "right" } }, "Participate"),
          ]),

          h("h2.border", "Getting started"),

          h("div.alternatives", [
            h("div", [
              h("h2", "RxJS"),
              h("div.alternatives", [
                h("div", [
                  screenshot,
                  h("div.mt1", [
                    h("a.btn", { attrs: { href: "#type=editor" } }, "Start Editor"),
                  ]),
                ]),
              ]),
            ]),
            h("div", [
              h("h2", "RxJS on Node"),
              h("div.alternatives", [
                h("div", [
                  npm,
                  h("div.mt1", [
                    h("a.btn", { attrs: { href: "http://npmjs.org/package/rxfiddle" } }, "Read tutorial"),
                  ]),
                ]),
              ]),
            ]),
            h("div", [
              h("h2", "Other Rx"),
              `This is a work in progress. You can help by creating collectors 
      for the JVM, Swift, .NET, Chrome DevTools, etc.`,
              h("div.mt1", [
                h("a.btn", { attrs: { href: "http://github.com/hermanbanken/RxFiddle/pulls" } }, "Pull Request"),
              ]),
            ]),
            h("div", [
              h("h2", "Samples"),
              `View samples from other developers and share your own`,
              h("div.mt1", [
                h("h3", ["Shared samples"]),
                h("div.snippets", Object.keys(snippets || {}).filter(key => validSnippet(snippets[key]))
                  .map(key => h("div.snippet", [
                    h("a",
                      { attrs: { href: `#type=editor&code=${btoa(snippets[key].code)}` } },
                      snippets[key].name
                    ),
                    h("div", snippets[key].description),
                  ]))
                ),
                h("h3", ["My samples"]),
                h("div.snippets", Object.keys(mySnippets || {}).filter(key => validSnippet(mySnippets[key]))
                  .map(key => h("div.snippet", [
                    h("a",
                      { attrs: { href: `#type=editor&code=${btoa(snippets[key].code)}` } },
                      snippets[key].name
                    ),
                    h("div", snippets[key].description),
                  ]))
                ),
              ]),
            ]),
          ]),

          h("h2.border", "Demo"),
          h("div.demo", { style: { "max-width": "560px", margin: "0 auto" } }, [
            h("div.aspect-ratio.aspect-ratio-16-9", [
              h("iframe", {
                attrs: {
                  allowfullscreen: "true",
                  frameborder: 0,
                  height: 350,
                  src: "https://www.youtube.com/embed/BYFMuPOIijw",
                  width: 560,
                },
              }),
            ]),
          ]),
        ])])
      })
  }
}

function validSnippet(snippet: any): snippet is Snippet {
  return typeof snippet === "object" && "name" in snippet && "description" in snippet && "code" in snippet
}
