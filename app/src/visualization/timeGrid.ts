import { h } from "snabbdom/h"
import { VNode } from "snabbdom/vnode"
import * as Rx from "rx"

export type Range = {
  min: number
  max: number
}

export type In = {
  selected: Rx.Observable<Range>
  bounds: Rx.Observable<Range>
}

export function horizontalSlider(input: In): { vnode: Rx.Observable<VNode>, selected: Rx.Observable<Range> } {

  let vnode$ = input.bounds.map(bounds => {
    let externalRange: number[] = mkRange(bounds.min, bounds.max, (bounds.max - bounds.min) / 10)

    let lines: VNode[] = externalRange.map((divisor, i) =>
      h("div.resources-divider", { style: { left: `${i * 10}%` } })
    )
    let labels: VNode[] = externalRange.map((divisor, i) =>
      h("div.resources-divider", { style: { left: `${i * 10}%` } }, [
        h("div.resources-divider-label", `${divisor} ms`),
      ])
    )

    let vnode = h("div#overview-grid", [
      h("canvas.resources"),
      h("div.resource-dividers", lines),
      h("div.timeline-grid-header", [h("div.resources-dividers-label-bar", labels)]),
    ])

    return vnode
  })

  return {
    selected: input.selected,
    vnode: vnode$,
  }
}

function mkRange(start: number, end: number, step: number = 1): number[] {
  let r = []
  for (let i = start; i < end; i += step) {
    r.push(i)
  }
  return r
}
