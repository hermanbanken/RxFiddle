import { UUID } from "../utils"
import { hbox } from "./flex"
import ReactiveStorage from "./reactiveStorage"
import { Query, QueryString } from "./shared"
import { menu } from "./splash"
import { Snippet, SnippetDict } from "../firebase"
import { eventTarget, lensSet, lensView, onChange, onClick, onInput, pipe, redux, setField, textarea } from "./redux"
import { Editor } from "codemirror"
import * as CodeMirror from "codemirror"
import "codemirror/mode/javascript/javascript"
import * as Rx from "rxjs"
import h from "snabbdom/h"
import { VNode } from "snabbdom/vnode"

function deleteAction(uid: string) {
  return () => {
    localStorage.removeItem(`cm_session.${uid}`)
    window.dispatchEvent(new Event("storageSnippets", {}))
  }
}

function localSnippets(): Rx.Observable<Snippet[]> {
  let localChanges = Rx.Observable.fromEvent(window, "storage")
    .filter((e: StorageEvent) => e.key.startsWith("cm_session."))
  let forcedChanges = Rx.Observable.fromEvent(window, "storageSnippets")

  let get: () => Snippet[] = () =>
    Object.keys(localStorage)
      .filter(key => key.startsWith("cm_session."))
      .map(key => localStorage.getItem(key))
      .flatMap(s => {
        try {
          let parsed = JSON.parse(s)
          if ("file" in parsed && "session" in parsed) {
            return [{
              code: parsed.code,
              description: parsed.file.props.description,
              isPublic: parsed.file.props.isPublic,
              name: parsed.file.props.title,
              uid: parsed.session,
            } as Snippet]
          }
          return typeof parsed === "object" ? [parsed] : []
        } catch (e) {
          console.warn("Parse error", e)
          return []
        }
      })
  return Rx.Observable.merge(localChanges, forcedChanges).startWith(0).map(_ => get())
}

export function SnippetBrowser(): Rx.Observable<VNode[]> {
  return Rx.Observable.combineLatest(
    localSnippets(),
    Rx.Observable.of([] as Snippet[]),
  ).map(([local, remote]) => {
    return [h("div", { attrs: { class: "samples" } }, [
      menu(Query.get("type")),
      hbox(
        List("Your snippets", local),
        List("Popular samples", local),
        List("Latest samples", local),
      ),
    ])]
  })
}

function List(title: string, list: any[]): VNode {
  return h("div.list", [
    h("h2", title),
    h("ol",
      list.map((snippet: Snippet) => {
        let href = "#" + QueryString.format({
          code: btoa(snippet.code),
          session: snippet.uid,
          type: "editor",
        })

        let limit = 12
        let codeExcerpt: VNode
        if (snippet.code && snippet.code.split("\n").length < limit) {
          codeExcerpt = h("pre.code", snippet.code)
        } else if (!snippet.code) {
          codeExcerpt = h("i.code.gray", "No code entered.")
        } else {
          codeExcerpt = h("div.code", [
            h("pre", snippet.code.split("\n").slice(0, limit).join("\n")),
            h("a.btn", "Code folded. Open to show full code"),
          ])
        }

        return h("li.snippet", [
          h("div.title", [
            h("div.right", [
              h("a.btn", { on: { click: deleteAction(snippet.uid) } }, "Delete"), " ",
              h("a.btn", { attrs: { href } }, "Open"),
            ]),
            h("a", { attrs: { href } }, [h("b", snippet.name || "Untitled")]),
            h("span.gray", snippet.isPublic ? " - public" : " - private"),
          ]),
          h("div.description", [snippet.description || h("i.gray", "No description provided.")]),
          codeExcerpt,
        ])
      }),
    ),
  ])
}
