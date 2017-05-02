import Languages, { LanguageCombination, RxJS4, RxJS5 } from "../languages"
import CodeEditor from "./codeEditor"
import * as Rx from "rxjs"
import { Observable } from "rxjs"
import h from "snabbdom/h"
import { VNode } from "snabbdom/vnode"

const hash = () => typeof window !== "undefined" ? window.location.hash.substr(1) : ""

const QueryString = {
  format: (object: any) => {
    let q = ""
    for (let k in sortSmallFirst(object)) {
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
  updated: (object: any) => {
    return QueryString.format(Object.assign(QueryString.parse(hash()), object))
  },
  get current(): any {
    return QueryString.parse(hash())
  },
}

const neverInNode = (subject: string) => Rx.Observable.defer(() =>
  Rx.Observable.throw(new Error(`Do not use ${subject} in a non-browser environment`))
)

let setting = false
export let Query = {
  $: typeof window === "object" ? Observable
    .fromEvent(window, "hashchange", () => hash())
    .startWith(hash())
    .map(str => QueryString.parse(str))
    .filter(_ => !setting) : neverInNode("shared/ui/Query"),
  $all: typeof window === "object" ? Observable
    .fromEvent(window, "hashchange", () => hash())
    .startWith(hash())
    .map(str => QueryString.parse(str))
    .distinctUntilChanged(equalHash) : neverInNode("shared/ui/Query"),
  set: (object: any) => {
    if (typeof window === "object") {
      setting = true
      if (!equalHash(QueryString.parse(window.location.hash), object)) {
        window.location.hash = QueryString.format(sortSmallFirst(object))
      }
      setTimeout(() => setting = false)
    }
  },
  update: (object: any) => {
    Query.set(Object.assign(QueryString.parse(hash()), object))
  },
}

export const sameOriginWindowMessages = typeof window === "object" ? Rx.Observable
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
      return new Rx.Observable(o => o.error(event.error))
    }
    return Rx.Observable.of(event)
  }) : neverInNode("shared/ui/sameOriginWindowMessages")

export class LanguageMenu {
  public static get(lib: string): LanguageCombination {
    return Languages.find(l => l.id === lib) || RxJS5
  }

  public stream(): { dom: Rx.Observable<VNode>, language: Rx.Observable<LanguageCombination> } {
    let subject = new Rx.BehaviorSubject<LanguageCombination>(
      Languages.find(l => l.id === QueryString.current.lib) ||
      Languages[Languages.length - 1]
    )
    return {
      dom: subject.map(selected => h("div.select", [
        h("div.selected", selected.name),
        h("div.options", [
          ...Languages.map(l => h("div.option", {
            on: { click: () => subject.next(l) },
          }, l.name)),
          h("div.option", h("a",
            { attrs: { href: "https://github.com/hermanbanken/RxFiddle/pulls" } },
            "issue Pull Request"
          )),
        ]),
      ])), language: subject,
    }
  }
}

const rxErrorHelp = [
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
  )]

export function errorHandler(e: Error): Rx.Observable<{ dom: VNode, timeSlider: VNode }> {
  if (e instanceof Error) {
    console.error(e)
  }
  return new Rx.Observable<{ dom: VNode, timeSlider: VNode }>(observer => {
    observer.next({
      dom: h("div.error", [
        h("p", [
          `An error occurred `,
          h("a.btn.btn-small", {
            on: {
              click: () => {
                observer.error(new Error("This error is catched and the stream is retry'd."))
                return false
              },
            },
          }, "Reload"),
        ]),
        h("pre.user-select",
          { style: { width: "100%" } },
          e.stack || `${e.name}: ${e.message}`
        ),
        ...(e.name !== "SyntaxError" ? rxErrorHelp : []),
      ]), timeSlider: undefined,
    })
  })
}

export function shareButton(editor: CodeEditor) {
  return h("a.btn", {
    attrs: { role: "button" },
    on: {
      click: (e: MouseEvent) => {
        editor.withValue(v => {
          Query.update({ code: btoa(v), type: "editor" });
          (e.target as HTMLAnchorElement).innerText = "Saved state in the url. Copy the url!"
        })
        return false
      },
      mouseenter: (e: MouseEvent) => {
        editor.withValue(v => {
          (e.target as HTMLAnchorElement).href = "#" + QueryString.updated({ code: btoa(v), type: "editor" })
        })
      },
      mouseout: (e: MouseEvent) => {
        (e.target as HTMLButtonElement).innerText = "Share"
      },
    },
  }, "Share")
}

function sortSmallFirst(object: any): any {
  return Object.keys(object)
    .sort((a, b) => object[a].length - object[b].length)
    .reduce((o, key) => {
      o[key] = object[key]
      return o
    }, {} as any)
}

function equalHash(a: any, b: any) {
  return (
    Object.keys(a).every(key => key in b && b[key] === a[key]) &&
    Object.keys(b).every(key => key in a && b[key] === a[key])
  )
}
