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

export default function slider(
  min: number, max: number, value: number,
  callback: (value: number, final: boolean) => void
): VNode {
  return h("div.slider", [
    h("input", {
      attrs: {
        type: "range",
        max,
        min,
        value,
      },
      // Manually set value, since it is not updated by snabbdom after intialization
      hook: {
        update: (old, next) => { (next.elm as HTMLInputElement).value = next.data.attrs.value },
      },
      // Fire on both change and input events, to handle intermediate range changes too
      on: {
        blur: (e: UIEvent) => callback(parseInt((e.target as HTMLInputElement).value, 10), true),
        change: (e: UIEvent) => callback(parseInt((e.target as HTMLInputElement).value, 10), true),
        input: (e: UIEvent) => callback(parseInt((e.target as HTMLInputElement).value, 10), false),
        mousedown: (e: MouseEvent) => dragStart(e),
      },
    }),
  ])
}
