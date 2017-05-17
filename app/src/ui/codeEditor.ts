// tslint:disable:object-literal-sort-keys
import { UUID } from "../utils"
import ReactiveStorage from "./reactiveStorage"
import { Query } from "./shared"
import { eventTarget, lensSet, lensView, onChange, onClick, onInput, pipe, redux, setField, textarea } from "./redux"
import { Editor } from "codemirror"
import * as CodeMirror from "codemirror"
import "codemirror/mode/javascript/javascript"
import * as Rx from "rxjs"
import h from "snabbdom/h"
import { VNode } from "snabbdom/vnode"

export type DynamicSource = {
  ranges: {
    code: string
    executionCode?: string
    readonly?: boolean
  }[]
}
export type CMMarkOptions = {
  className?: string
  atomic?: boolean
  readOnly?: boolean
}
export type Pos = { line: number, ch: number }
export type Ranges = { from: Pos, to: Pos, options: CMMarkOptions }[]
export type LineClasses = { line: number, where: "text" | "background" | "gutter" | "wrap", class: string }[]
export type Source = string | DynamicSource

type CodeEditorMessage = { desiredWidth: number } | { code: string }

// Defines possible input to the CodeEditor
export type EditorInput = { type: "highlight", from: Pos, to: Pos }

type CEAction =
  { type: "CodeTyped", code: string } |
  { type: "DesiredWidth", width: number } |
  { type: "Save" } |
  { type: "External", state: CodeEditorState }

function codeEditor(state: InternalState, dispatch: (a: CEAction) => void) {
  return h("div.rxf-cm-wrapper", {
    code: state.file.code || "",
    hook: {
      destroy: (n) => n.data.subscription && n.data.subscription.unsubscribe(),
      insert: (node) => {
        setTimeout(() => {
          let editor = node.data.editor = CodeMirror(node.elm as HTMLElement, {
            lineNumbers: true,
            mode: "javascript",
            value: state.file.code || "",
          })
          editor.setOption("styleActiveLine", true)
          // Dynamic behaviour
          editor.on("change", () => {
            dispatch({ code: editor.getDoc().getValue(), type: "CodeTyped" })
            dispatch({
              type: "DesiredWidth",
              width: getWidth(editor) * editor.defaultCharWidth() + editor.getGutterElement().clientWidth + 15
            })
          })
          CodeMirror.signal(editor, "change")
        }, 0)
      },
      update: (old, next) => {
        let editor = old.data.editor
        if (editor && editor.getValue() !== next.data.code) {
          editor.getDoc().setValue(next.data.code)
        }
      },
    },
  })
}

type FileState = {
  title: string, description: string, isPublic: boolean, code: string
}
type CMAction = { type: "Update", field: string, value: any } | { type: "New" } | { type: "Browser" }

function nest(path: string, dispatch: (e: CMAction) => void): (e: CMAction) => void {
  return (e) => {
    if (e.type === "Update") {
      dispatch({ field: `${path}.${e.field}`, type: e.type, value: e.value })
    } else {
      dispatch(e)
    }
  }
}

let star = h("svg", {
  attrs: { class: "icon", "aria-hidden": "true", height: "16", version: "1.1", viewBox: "0 0 14 16" }
}, [h("path", {
  attrs: {
    d: "M14 6l-4.9-.64L7 1 4.9 5.36 0 6l3.6 3.26L2.67 14 7 11.67 11.33 14l-.93-4.74z",
    fill: "white",
    "fill-rule": "evenodd",
  },
})])

let runIcon = h("svg", {
  attrs: { class: "icon", "aria-hidden": "true", height: "16", version: "1.1", viewBox: "0 0 14 16" }
}, [h("path", {
  attrs: {
    d: "M 12 8 L 3 14 L 3 2 z",
    fill: "white",
    "fill-rule": "evenodd",
  },
})])

function runButton(state: InternalState, dispatch: (a: CMAction) => void) {
  switch (state.externalState && state.externalState.type) {
    case "running": return h("a.btn", {
      on: onClick(pipe(() => ({ type: "External", state: { type: "stopped" } }), dispatch)),
    }, [runIcon, " Stop" as any as VNode])
    case "stopped":
    case "error":
    default: return h("a.btn", {
      on: onClick(pipe(() => ({ type: "External", state: { type: "running" } }), dispatch)),
    }, [runIcon, " Run" as any as VNode])
  }
}

function codeMenu(state: InternalState, dispatch: (a: CMAction) => void) {
  return h("div.editor-info.noflex", [
    h("label", { attrs: { for: "editor-info-open" } }, [
      h("div", { attrs: { class: `bar` } }, [
        h("a", {
          attrs: { role: "button", class: `btn ${state.menuOpen ? "active" : ""}` },
          on: onClick(pipe(setField("menuOpen", !state.menuOpen), dispatch)),
        }, [
            h("span", "Snippet"),
          ]),
        " " as any as VNode,
        h("a.filename", {
          attrs: { role: "button", title: "Change file name & description" },
          on: onClick(pipe(setField("menuOpen", !state.menuOpen), dispatch)),
        }, [h("span", state.file.title || "Untitled")]),
        /*" " as any as VNode,
        star, " 10" as any as VNode,*/
        h("div.right", [/*h("a.btn", [star, " Star"]), " ",*/ runButton(state, dispatch)]),
      ]),
      state.file.description ? h("div", { attrs: { class: `bar ${state.menuOpen ? "collapsed" : "open"}` } }, [
        h("i.group", state.file.description),
      ]) : h("div"),
      h("div", { attrs: { class: `${state.menuOpen ? "open" : "collapsed"}` } }, [
        // h("a.btn.active", { attrs: { role: "button" }, on: onClick(pipe(setField("open", false), dispatch)) }, [
        //   h("span", "File"),
        // ]),
        /*" " as any as VNode,
       star, " 10" as any as VNode,*/
        // h("div.right", [/*h("a.btn", [star, " Star"]), " ",*/ h("a.btn", [runIcon, " Run"])]),
        h("a.btn.group", {
          on: {
            click: () =>
              confirm(`Start a new snippet? Your current snippet will be available in Snippet Browser.`) &&
              dispatch({ type: "New" }),
          },
        }, [
            "New snippet" as any as VNode, h("span.right", "⌘N"),
          ]),
        h("a.btn.group", { on: { click: () => dispatch({ type: "Browser" }) } }, [
          "Browse snippets" as any as VNode, h("span.right", "⌘O"),
        ]),
        h("a.btn.group", [
          "Import file", h("span.right", "⌘I"),
        ]),
        h("label.group", ["Title", h("input", {
          attrs: { placeholder: "Untitled", value: state.file.title },
          on: onInput(pipe(eventTarget, setField("file.title"), dispatch)),
        })]),
        h("label.group", ["Description", textarea({
          key: "cm-description",
          on: onInput(pipe(eventTarget, setField("file.description"), dispatch)),
        }, state.file.description)]),
        h("label.group", [h("input.inline", {
          attrs: { checked: !!state.file.isPublic, type: "checkbox" },
          on: onChange(pipe(eventTarget, setField("file.isPublic"), dispatch)),
        }), "Make public"]),
      ]),
    ]),
  ])
}

function runMenu(state: InternalState, dispatch: (a: CMAction) => void) {
  return h("div.editor-info.noflex", [
    h("label", { attrs: { for: "editor-info-open" } }, [
      h("div", { attrs: { class: `bar` } }, [
        h("div", { style: { flex: "1" } }),
        h("div.right", [runButton(state, dispatch)]),
      ]),
    ]),
  ])
}

function getOrElseSet(key: string, create: () => string): string {
  let value = localStorage.getItem(key)
  if (!value) {
    value = create()
    localStorage.setItem(key, value)
  }
  return value
}

type InternalState = {
  session: string,
  file: FileState,
  desiredWidth: number,
  dirty?: boolean,
  menuOpen?: boolean,
  externalState?: CodeEditorState
}
export type CodeEditorState = { type: "stopped" } | { type: "running" } | { type: "error", position: Pos, error: Error }

export default class CodeEditor {
  public dom: Rx.Observable<VNode>
  public code: Rx.Observable<string>
  public inbox: Rx.Observer<EditorInput>
  public externalState: Rx.Observable<CodeEditorState>
  private loop: {
    dispatch: (e: CEAction | CMAction) => void,
    run: (render: (state: InternalState, dispatch: (e: CEAction | CMAction) => void) => VNode) => Rx.Observable<VNode>
    state: Rx.Observable<InternalState>,
  }

  constructor(
    fixedSession?: string, initialSource?: string,
    ranges?: Ranges, lineClasses?: LineClasses,
    hideMenu?: boolean
  ) {
    let sessionId = typeof fixedSession !== "undefined" ? fixedSession : getOrElseSet("cm_session", UUID)

    let data = new ReactiveStorage<string, string>(`cm_session.${sessionId}`)
      .project<InternalState>(json => JSON.parse(json) || {}, v => JSON.stringify(v))

    let defaultFile = {
      title: "", description: "", isPublic: false,
      code: "",
    }

    function fix(o: InternalState): InternalState {
      return {
        session: o.session || sessionId,
        desiredWidth: o.desiredWidth || 0,
        menuOpen: false,
        file: Object.assign(o.file || defaultFile, {
          code: typeof fixedSession === "undefined" ? o.file && o.file.code || initialSource : initialSource,
        }),
      }
    }

    let loop = this.loop = redux(fix(data.current), (s, e: CEAction | CMAction) => {
      if (e.type === "CodeTyped") {
        e = { type: "Update", field: "code", value: e.code }
      }
      switch (e.type) {
        case "External":
          return lensSet("externalState", e.state)(s)
        case "New":
          let uuid = UUID()
          localStorage.setItem("cm_session", uuid)
          data = new ReactiveStorage<string, string>(`cm_session.${uuid}`)
            .project<InternalState>(json => JSON.parse(json) || {}, v => JSON.stringify(v))
          s = fix(data.current)
          s.session = uuid
          return s
        case "Update":
          let changed = lensView(e.field)(s) !== e.value
          s = lensSet(e.field, e.value)(s)
          if (e.field !== "menuOpen" && changed) {
            s = lensSet("dirty", true)(s)
          }
          return s
        case "DesiredWidth":
          return lensSet("desiredWidth", e.width)(s)
        case "Browser":
        case "Save":
          s = lensSet("dirty", false)(s)
          let saved = lensSet("menuOpen", undefined)(s)
          data.next(saved)
          if (e.type === "Browser") {
            Query.set({ type: "samples" })
          }
          return s
        default:
      }
      return s
    })

    loop.state.debounceTime(1000).subscribe(state => {
      if (state.dirty) {
        loop.dispatch({ type: "Save" })
      }
    })

    this.externalState = loop.state.map(_ => _.externalState)

    this.dom = loop.run((state, dispatch) => {
      return h("div.editor.flexy.flexy-v", { style: { width: `${Math.max(320, state.desiredWidth || 0)}px` } },
        typeof hideMenu !== "undefined" && !hideMenu ?
          [codeMenu(state, dispatch), codeEditor(state, dispatch)] :
          [runMenu(state, dispatch), codeEditor(state, dispatch)]
      )
    })
    this.code = loop.state.map(s => s.file.code)
  }

  public setState(externalState: CodeEditorState) {
    this.loop.dispatch({ type: "External", state: externalState })
  }

}

// maximum character width of editor lines
function getWidth(editor: Editor): number {
  let tabSize = editor.getOption("tabSize")
  let spaces = range(0, tabSize).map(_ => "_").join("")
  let code = editor.getValue()
  return code
    .split("\n")
    .map((line: string) => line.replace(/\t/g, spaces).length)
    .sort((a: number, b: number) => b - a)[0] || 0
}

function range(start: number, end: number): number[] {
  let r = []
  for (let i = start; i < end; i++) {
    r.push(i)
  }
  return r
}
