import { LanguageCombination } from "../languages"
import CodeEditor from "./codeEditor"
import * as Rx from "rx"
import h from "snabbdom/h"
import { VNode } from "snabbdom/vnode"

export function formatHash(object: any): string {
  let q = ""
  for (let k in object) {
    if (object.hasOwnProperty(k)) {
      q += (q ? "&" : "") + k + "=" + object[k]
    }
  }
  return q
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
  let next = Rx.Observable.create(sub => {
    setTimeout(() => sub.onError(new Error("Continue")), 5000)
  })
  return Rx.Observable.just({
    dom: h("div", [
      h("p", `Krak!`),
      h("p", `Global error handling (anything not Rx onError's ) is not yet done. 
      Also, please make sure to handle errors in your subscribe calls, otherwise they bubble into global errors!`),
      h("a.btn", { attrs: { href: "javascript:window.location.reload()" } }, "Reload"),
      h("textarea",
        { style: { height: "50vh", overflow: "auto", width: "50vw" } },
        e.stack || JSON.stringify(e, null, 2)
      ),
    ]), timeSlider: h("div"),
  }).merge(next)
}

export function shareButton(editor: CodeEditor) {
  return h("button.btn", {
    on: {
      click: (e: MouseEvent) => {
        editor.withValue(v => {
          window.location.hash = formatHash({ code: btoa(v), type: "editor" });
          (e.target as HTMLButtonElement).innerText = "Saved state in the url. Copy the url!"
        })
      },
      mouseout: (e: MouseEvent) => {
        (e.target as HTMLButtonElement).innerText = "Share"
      },
    },
  }, "Share")
}
