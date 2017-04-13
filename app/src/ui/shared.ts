import { LanguageCombination } from "../languages"
import CodeEditor from "./codeEditor"
import * as Rx from "rx"
import h from "snabbdom/h"
import { VNode } from "snabbdom/vnode"

const QueryString = {
  format: (object: any) => {
    let q = ""
    for (let k in object) {
      if (object.hasOwnProperty(k)) {
        q += (q ? "&" : "") + k + "=" + object[k]
      }
    }
    return q
  },
  parse: (queryString: string) => {
    return queryString.split("&").map(p => p.split("=")).reduce((p: any, n: string[]) => {
      if (n[0].endsWith("[]")) {
        let key = n[0].substr(0, n[0].length - 1)
        p[key] = p[key] || []
        p[key].push(n[1])
      } else {
        p[n[0]] = n[1]
      }
      return p
    }, {}) || {}
  },
}

let setting = false
export let Query = {
  $: typeof window === "object" ? Rx.Observable
    .fromEvent(window, "hashchange", () => window.location.hash.substr(1))
    .startWith(window.location.hash.substr(1))
    .map(str => QueryString.parse(str))
    .filter(_ => !setting) : Rx.Observable.never(),
  set: (object: any) => {
    if (typeof window === "object") {
      setting = true
      window.location.hash = QueryString.format(object)
      setTimeout(() => setting = false)
    }
  },
}

export const sameOriginWindowMessages = Rx.Observable
  .fromEvent(window, "message", (e: any) => {
    // For Chrome, the origin property is in the event.originalEvent object.
    let origin = e.origin || (e as any).originalEvent.origin
    if (origin !== window.location.origin) {
      return
    }

    return e.data
  })
  .flatMap(event => {
    // Emit Editor errors in this stream; todo: move this throw elsewhere
    if (event && event.type === "error") {
      return Rx.Observable.create(o => o.onError(event.error))
    }
    return Rx.Observable.just(event)
  })

export class LanguageMenu {
  public stream(): { dom: Rx.Observable<VNode>, language: Rx.Observable<LanguageCombination> } {
    return {
      dom: Rx.Observable.just(h("div.select", [
        h("div.selected", "RxJS 4"),
        h("div.options", [
          h("div.option", "RxJS 4"),
          h("div.option", h("a",
            { attrs: { href: "https://github.com/hermanbanken/RxFiddle/pulls" } },
            "issue Pull Request"
          )),
        ]),
      ])), language: Rx.Observable.never<LanguageCombination>(),
    }
  }
}

export function errorHandler(e: Error): Rx.Observable<{ dom: VNode, timeSlider: VNode }> {
  return Rx.Observable.just({
    dom: h("div.error", [
      h("p", [
        `An error occurred `,
        h("a.btn.btn-small", { attrs: { href: "javascript:window.location.reload()" } }, "Reload"),
      ]),
      h("pre.user-select",
        { style: { width: "100%" } },
        e.stack || JSON.stringify(e, null, 2)
      ),
      h("p", [
        `Please note that global error handling is not implemented.
         Anything not captured in Rx onError's is thrown here.`, h("br"),
        `Make sure to handle errors in your subscribe calls by providing a function to the onError argument like so:`]),
      h("pre.user-select",
        { style: { width: "100%" } },
        `Rx.Observable
  .create(o => o.onError(new Error()))
  .subscribe(
    next => {}, 
    error => { /* this callback is needed */ }
  )`
      ),
    ]), timeSlider: h("div"),
  })
}

export function shareButton(editor: CodeEditor) {
  return h("button.btn", {
    on: {
      click: (e: MouseEvent) => {
        editor.withValue(v => {
          Query.set({ code: btoa(v), type: "editor" });
          (e.target as HTMLButtonElement).innerText = "Saved state in the url. Copy the url!"
        })
      },
      mouseout: (e: MouseEvent) => {
        (e.target as HTMLButtonElement).innerText = "Share"
      },
    },
  }, "Share")
}
