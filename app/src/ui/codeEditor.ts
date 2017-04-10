import { sameOriginWindowMessages } from "./shared"
import * as Rx from "rx"
import h from "snabbdom/h"
import { VNode } from "snabbdom/vnode"

export default class CodeEditor {
  public dom: Rx.Observable<VNode>
  private frameWindow: Window = null

  constructor(initialSource?: string) {
    let src: string
    if (typeof initialSource !== "string" && localStorage && localStorage.getItem("code")) {
      initialSource = localStorage.getItem("code")
    }
    if (typeof initialSource === "string" && initialSource) {
      src = "editor.html#blob=" + encodeURI(btoa(initialSource))
    } else {
      src = "editor.html"
    }
    this.dom = sameOriginWindowMessages
      .startWith({})
      .scan((prev, message) => {
        return Object.assign(prev, message)
      }, {})
      .map(state => h("div.editor", {
        style: {
          "max-width": `${Math.max(400, state.desiredWidth)}px`,
          "min-width": `${Math.max(400, state.desiredWidth)}px`,
        },
      }, [h("iframe", {
        attrs: { src },
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
        .map(d => d.code)
        .do(code => localStorage && localStorage.setItem("code", code))
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
