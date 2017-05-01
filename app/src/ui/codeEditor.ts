import { sameOriginWindowMessages } from "./shared"
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

export default class CodeEditor {
  public dom: Rx.Observable<VNode>
  private frameWindow: Window = null

  constructor(initialSource?: string, ranges?: Ranges, lineClasses?: LineClasses) {
    let src: string
    if (typeof initialSource === "undefined" && localStorage && localStorage.getItem("code")) {
      initialSource = js.r(localStorage.getItem("code"))
    }

    if (typeof initialSource === "string" && initialSource) {
      let data = JSON.stringify([{ code: initialSource, ranges, lineClasses }])
      src = "editor.html#blob=" + encodeURI(btoa(data))
    } else {
      src = "editor.html"
    }

    let hook = (next: VNode) => {
      this.frameWindow = (next.elm as HTMLIFrameElement).contentWindow
      if ((this.frameWindow as any).lastCode !== initialSource) {
        this.send({ code: initialSource, ranges, lineClasses })
      }
      (this.frameWindow as any).lastCode = initialSource
    }

    this.dom = sameOriginWindowMessages
      .startWith({ desiredWidth: 320 })
      .scan((prev, message) => {
        return Object.assign({}, prev, message) as CodeEditorMessage & { desiredWidth: number }
      }, {})
      .distinctUntilChanged()
      .map((state: { desiredWidth: number }) => h("div.editor.flexy.flexy-v", {
        style: {
          width: `${Math.max(320, state.desiredWidth)}px`,
        },
      }, [h("iframe", {
        attrs: { src },
        hook: {
          insert: (next) => hook(next),
          update: (prev, next) => hook(next),
        },
      })]))
  }

  public send(object: any) {
    if (this.prepare()) {
      this.frameWindow.postMessage(object, window.location.origin)
    }
  }

  public withValue(cb: (code: string) => void) {
    if (this.prepare()) {
      sameOriginWindowMessages
        .take(1)
        .filter(d => d && "code" in d)
        .map((d: { code: string }) => d.code)
        .do(code => localStorage && localStorage.setItem("code", js.w(code)))
        .subscribe(cb)
      this.frameWindow.postMessage("requestCode", window.location.origin)
    }
  }

  private prepare(): boolean {
    if (!this.frameWindow) {
      let frame = document.querySelector("iframe")
      this.frameWindow = frame && frame.contentWindow
    }
    return this.frameWindow && true || false
  }
}

const js = {
  r: (str: string) => str[0] === '"' || str[0] === "{" ? JSON.parse(str) : str,
  w: (obj: any) => JSON.stringify(obj),
}
