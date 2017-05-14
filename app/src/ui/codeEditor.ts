import { UUID } from "../utils"
import * as Rx from "rxjs"
import { Doc, Editor } from "codemirror"
import * as CodeMirror from "codemirror"
import "codemirror/mode/javascript/javascript"
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

type CEState = { code: string }
type CEAction = { type: "CodeTyped", code: string } | { type: "DesiredWidth", width: number }

function codeEditor(state: CEState, dispatch: (a: CEAction) => void) {
  return h("div.rxf-cm-wrapper", {
    code: state.code,
    hook: {
      destroy: (n) => n.data.subscription && n.data.subscription.unsubscribe(),
      insert: (node) => {
        setTimeout(() => {
          let editor = node.data.editor = CodeMirror(node.elm as HTMLElement, {
            lineNumbers: true,
            mode: "javascript",
            value: state.code,
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
        if (typeof next.data.code === "string" && old.data.editor.getValue() !== next.data.code) {
          old.data.editor.getDoc().setValue(next.data.code)
        }
      },
    },
  })
}

type CMState = {
  open: boolean,
  props: { title: string, description: string, isPublic: boolean }
}
type CMAction = {}

function pipe(...fs: Function[]): Function {
  return (v: any) => fs.reduce((s, f) => f(s), v)
}
function eventTarget(e: Event): any {
  return (e.target as HTMLInputElement).value
}
function setField(field: string): (data: any) => { type: "Update", field: string, value: any } {
  return (value) => ({ type: "Update", field, value })
}
function onInput(f: Function) {
  return { input: f }
}

function codeMenu(state: CMState, dispatch: (a: CMAction) => void) {
  return h("div.editor-info.noflex", [
    h("input#editor-info-open.toggle", { attrs: { type: "checkbox" } }),
    h("label", { attrs: { for: "editor-info-open" } }, [
      h("div.collapsed.bar", [
        h("span", state.props.title),
        h("div.right", [h("span", "Star"), " ", h("span", "Save")]),
      ]),
      h("div.open", [
        h("div.bar", "Meta"),
        h("label.group", ["Title", h("input", {
          attrs: { placeholder: "Untitled" },
          on: onInput(pipe(eventTarget, setField("props.title"), dispatch))
        })]),
        h("label.group", ["Description", h("textarea", {
          on: onInput(pipe(eventTarget, setField("props.description"), dispatch)),
        }, state.props.description)]),
        h("label.group", [h("input.inline", {
          attrs: { checked: !!state.props.isPublic, type: "checkbox" },
          on: { input: pipe(eventTarget, setField("props.isPublic"), dispatch) },
        }), "Make public"]),
      ]),
    ]),
  ])
}

// type EditorData = {
//   files: EditorFile
// }

// class TFBProjection {

// }

// class TinyFirebase {
//   private changes = Rx.Observable.fromEvent(window, "storage")
//   public get(path: string): TFBProjection {
//     return
//   }
//   private read(path: string) {
//     return 
//   }
// }

// const tfb = new TinyFirebase()

function getOrElseSet(key: string, create: () => string): string {
  let value = localStorage.getItem(key)
  if (!value) {
    value = create()
    localStorage.setItem(key, value)
  }
  return value
}

class ReactiveStorage extends Rx.Subject<string> {
  private sub: Rx.Subscription
  // tslint:disable-next-line:no-constructor-vars
  constructor(private key: string) {
    super()
    Rx.Observable.fromEvent(window, "storage")
  }
  public get current() {
    return localStorage.getItem(this.key)
  }
  public next(value: string) {
    if (localStorage.getItem(this.key) !== value) {
      localStorage.setItem(this.key, value)
    }
    super.next(value)
  }
  public unsubscribe() {
    this.sub.unsubscribe()
    this.sub = undefined
    super.unsubscribe()
  }
  protected _subscribe(subscriber: Rx.Subscriber<string>) {
    if (!this.sub) {
      this.sub = Rx.Observable.fromEvent(window, "storage")
        .filter((e: StorageEvent) => e.key === this.key)
        .startWith({ key: this.key, newValue: localStorage.getItem(this.key) })
        .subscribe((e: StorageEvent) => this.next(e.newValue))
    }
    return super._subscribe(subscriber)
  }
}

// function val(input: HTMLInputElement, set: string ): string | undefined {
//   if(input.tagName === "textarea") {

//   } else {

//   }
// }

function bind(storage: ReactiveStorage, vn: VNode): VNode {
  let sub = storage.subscribe(v => {
    if (vn.elm && (vn.elm as HTMLInputElement).type === "checkbox") { (vn.elm as HTMLInputElement).checked = !!v; return }
    if (vn.elm) { (vn.elm as HTMLInputElement).value = v }
  })
  vn.data.attrs = vn.data.attrs || {}
  vn.data.on = vn.data.on || {}
  vn.data.hook = vn.data.hook || {}

  vn.data.attrs.value = storage.current
  vn.data.on.change = (e: Event) => {
    if (vn.elm && (vn.elm as HTMLInputElement).type === "checkbox") {
      return storage.next((e.target as HTMLInputElement).checked ? "1" : "0")
    }
    storage.next((e.target as HTMLInputElement).value)
  }
  vn.data.hook.destroy = () => { sub.unsubscribe() }
  return vn
}

function attach(storage: ReactiveStorage, vn: VNode): VNode {
  let sub = storage.subscribe(v => {
    if (vn.elm) { (vn.elm as HTMLElement).innerText = v }
  })
  vn.text = storage.current
  vn.data.on = vn.data.on || {}
  vn.data.hook = vn.data.hook || {}
  vn.data.hook.destroy = () => { sub.unsubscribe() }
  return vn
}

export default class CodeEditor {
  public dom: Rx.Observable<VNode>
  public inbox: Rx.Observer<EditorInput>
  private frameWindow: Window = null
  private editor: Editor

  constructor(fixedSession?: string, initialSource?: string, ranges?: Ranges, lineClasses?: LineClasses) {
    let src: string
    let session = typeof fixedSession === "undefined" ? getOrElseSet("cm_session", UUID) : fixedSession

    let code = new ReactiveStorage(`cm_session.${session}.code`)
    if (typeof initialSource === "string") {
      code.next(initialSource)
    }

    let subject = new Rx.Subject<CodeEditorMessage>()

    let cm = h("div.rxf-cm-wrapper", {
      hook: {
        destroy: (n) => n.data.subscription && n.data.subscription.unsubscribe(),
        insert: (node) => {
          setTimeout(() => {
            let editor = this.editor = node.data.editor = CodeMirror(node.elm as HTMLElement, {
              lineNumbers: true,
              mode: "javascript",
              value: code.current,
            })
            editor.setOption("styleActiveLine", true)
            // Dynamic behaviour
            editor.on("change", () => {
              code.next(editor.getDoc().getValue())
              subject.next({
                desiredWidth: getWidth(editor) * editor.defaultCharWidth() + editor.getGutterElement().clientWidth + 15,
              })
            })
            CodeMirror.signal(editor, "change")
            node.data.subscription = code.subscribe(value => {
              if (typeof value === "string" && editor.getValue() !== value) {
                editor.getDoc().setValue(value)
              }
            })
          }, 0)
        },
      },
    })

    let title = new ReactiveStorage(`cm_session.${session}.title`)
    let description = new ReactiveStorage(`cm_session.${session}.description`)
    let ispublic = new ReactiveStorage(`cm_session.${session}.public`)

    let info = h("div.editor-info.noflex", [
      h("input#editor-info-open.toggle", { attrs: { type: "checkbox" } }),
      h("label", { attrs: { for: "editor-info-open" } }, [
        h("div.collapsed.bar", [
          attach(title, h("span", "Title")),
          h("div.right", [h("span", "Star"), " ", h("span", "Save")]),
        ]),
        h("div.open", [
          h("div.bar", "Meta"),
          h("label.group", ["Title", bind(title, h("input", { attrs: { placeholder: "Untitled" } }))]),
          h("label.group", ["Description", bind(description, h("textarea", {}, description.current))]),
          h("label.group", [bind(ispublic, h("input.inline", {
            attrs: { checked: !!ispublic.current, type: "checkbox" },
          })), "Make public"]),
        ]),
      ]),
    ])

    let runbar = h("div.editor-toolbar", [

    ])

    this.dom = subject
      .startWith({ desiredWidth: 320 })
      .scan((prev, message) => {
        return Object.assign({}, prev, message) as CodeEditorMessage & { desiredWidth: number }
      }, {})
      .distinctUntilChanged()
      .map((state: { desiredWidth: number }) => h("div.editor.flexy.flexy-v", {
        style: {
          width: `${Math.max(320, state.desiredWidth)}px`,
        },
      }, typeof fixedSession === "undefined" ? [info, cm] : [cm]))
  }

  public send(object: any) {
    console.log("Send")
  }

  public withValue(cb: (code: string) => void) {
    if (this.editor) {
      return cb(this.editor.getDoc().getValue())
    }
  }
}

const js = {
  r: (str: string) => str[0] === '"' || str[0] === "{" ? JSON.parse(str) : str,
  w: (obj: any) => JSON.stringify(obj),
}

// interface Channel<T,R> extends Rx.Observable<T>, Rx.Subject<R> {
//   public lift() {}
// }

class CodeEditorSubject<T> extends Rx.AnonymousSubject<T> {
  private output: Rx.Subject<T>

  constructor() {
    super()
    this.output = new Rx.Subject<T>()
  }

  public unsubscribe() {
    // const { source } = this
    // if (worker && worker.readyState === "ready") {
    //   worker.terminate()
    //   this._resetState()
    // }
    // super.unsubscribe()
    // if (!source) {
    //   this.destination = new Rx.ReplaySubject()
    // }
  }

  public next(value: T): void {
    // let { source } = this
    // if (source) {
    //   super.next(value)
    // } else if (this.worker) {
    //   this.worker.readyState = "used"
    //   this.notify("used")
    //   this.worker.postMessage(value)
    // }
  }

  // protected notify(state: RxRunnerState) {
  //   // if (this.config.stateObserver) {
  //   //   this.config.stateObserver.next(state)
  //   // }
  // }

  protected _resetState() {
    // if (this.worker) {
    //   this.worker.readyState = "stopped"
    // }
    // this.notify("stopped")
    // this.worker = null
    // if (!this.source) {
    //   this.destination = new Rx.ReplaySubject()
    // }
    // this.output = new Rx.Subject<T>()
  }

  protected connect() {
    // const config = this.config
    // const worker = this.worker = new Worker(config.workerFile) as RunnerWorker
    // const observer = this.output
    // worker.readyState = "initializing"
    // this.notify("initializing")

    // let t = worker.terminate
    // worker.terminate = function () {
    //   t.bind(worker)()
    // }

    // const subscription = new Subscription(() => {
    //   this.worker = null
    //   if (worker && worker.readyState === "ready") {
    //     worker.terminate()
    //   }
    // })

    // const close = (e: CloseEvent) => {
    //   this._resetState()
    //   worker.terminate()
    //   this.notify("stopped")
    //   observer.complete()
    //   if (e.wasClean) {
    //     observer.complete()
    //   } else {
    //     observer.error(e)
    //   }
    // }

    // const onOpen = () => {
    //   const openObserver = config.openObserver
    //   if (openObserver) {
    //     openObserver.next({ type: "open" } as Event)
    //   }
    //   const queue = this.destination
    //   this.destination = Subscriber.create(
    //     (x) => (worker.readyState === "ready") && worker.postMessage(x),
    //     (e) => close(e),
    //     () => close({ code: 0, reason: "complete", wasClean: true } as CloseEvent)
    //   )
    //   if (queue && queue instanceof Rx.ReplaySubject) {
    //     subscription.add((queue as Rx.ReplaySubject<T>).subscribe(this.destination))
    //   }
    // }

    // worker.onerror = (e: Event) => {
    //   this._resetState()
    //   observer.error(e)
    // }
    // worker.onmessage = (e: MessageEvent) => {
    //   if (e.data === "ready") {
    //     if (config.libraryFile) {
    //       worker.postMessage({ type: "importScripts", url: config.libraryFile })
    //     }
    //     worker.readyState = "ready"
    //     this.notify("ready")
    //     return
    //   }
    //   let result: T
    //   let f: (m: MessageEvent) => T = config.resultSelector || ((m: MessageEvent) => m.data as T)
    //   try {
    //     result = f(e)
    //   } catch (error) {
    //     observer.error(error)
    //     return
    //   }

    //   observer.next(result)
    // }

    // onOpen()

    // return subscription
  }

  protected _subscribe(subscriber: Rx.Subscriber<T>): Rx.Subscription {
    // const { source } = this
    // if (source) {
    //   return source.subscribe(subscriber)
    // }
    // if (!this.worker) {
    //   this.connect()
    // }
    // let subscription = new Subscription()
    // subscription.add(this.output.subscribe(subscriber))
    // subscription.add(() => {
    //   const { worker } = this
    //   if (this.output.observers.length === 0) {
    //     if (worker && worker.readyState === "ready") {
    //       worker.terminate()
    //     }
    //     this._resetState()
    //   }
    // })
    // return subscription
    return
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
