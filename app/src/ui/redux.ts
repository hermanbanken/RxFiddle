import * as Rx from "rxjs"
import h from "snabbdom/h"
import { VNode, VNodeData } from "snabbdom/vnode"

export function pipe(...fs: Function[]): Function {
  return (v: any) => fs.reduce((s, f) => f(s), v)
}
export function eventTarget(e: Event): any {
  return (e.target as HTMLInputElement).value
}
export function setField(field: string, val?: any): (data: any) => { type: "Update", field: string, value: any } {
  return (value) => ({ type: "Update", field, value: typeof val === "undefined" ? value : val })
}
export function onInput(f: Function) {
  return { input: f }
}
export function onClick(f: Function) {
  return { click: f }
}
export function onChange(f: Function) {
  return { change: f }
}

export function textarea(data: VNodeData, value?: string): VNode {
  data.hook = data.hook || {}
  data.hook.prepatch = (old, next) => {
    next.elm = old.elm
    if (next.elm) {
      let val = next.text
      next.text = old.text;
      (next.elm as HTMLTextAreaElement).value = val
    }
  }
  return h("textarea", data, value)
}

export function redux<S, E>(
  initial: S,
  reduce: (state: S, e: E) => S,
): {
    dispatch: (e: E) => void,
    run: (render: (state: S, dispatch: (e: E) => void) => VNode) => Rx.Observable<VNode>
    state: Rx.Observable<S>,
  } {
  let subject = new Rx.Subject<E>()
  let state = subject.scan(reduce, initial).startWith(initial).publishReplay(1)
  state.connect()
  return {
    dispatch: (e) => subject.next(e),
    run: (render: (state: S, dispatch: (e: E) => void) => VNode) => state.map(s => render(s, e => subject.next(e))),
    state,
  }
}

export function set(obj: any, field: string, value: any) {
  let update = {} as any
  update[field] = value
  return Object.assign({}, obj, update)
}

export function lensSet(field: string, value: any): (obj: any) => any {
  return field.split(".").reduceRight((p, key) => (o: any) => set(o, key, p(o[key])), (o: any) => value)
}

export function lensView(field: string): (obj: any) => any {
  return (obj) => field.split(".").reduce((o, key) => typeof o === "object" ? o[key] : undefined, obj)
}
