import * as Rx from "rx"
import { h } from "snabbdom"
import { VNode } from "snabbdom/vnode"

function dragStart(e: MouseEvent): Rx.Observable<{ x: number, y: number }> {
  return Rx.Observable
    .fromEvent(document, "mouseup").take(1).let(up => Rx.Observable
      .fromEvent(document, "mousemove")
      .takeUntil(up)
      .concat(up)
    )
    .map((me: MouseEvent) => ({ x: me.x, y: me.y }))
}

export default function slider(min: number, max: number, value: number, callback: (value: number) => void): VNode {
  return h("div.slider", [
    h("input", {
      attrs: {
        type: "range",
        max,
        min,
        value,
      },
      on: {
        change: (e: UIEvent) => callback(parseInt((e.target as HTMLInputElement).value, 10)),
        mousedown: (e: MouseEvent) => dragStart(e),
      },
    }),
  ])
}
