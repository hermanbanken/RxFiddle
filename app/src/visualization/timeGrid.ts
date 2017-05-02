import { h } from "snabbdom/h"
import { VNode } from "snabbdom/vnode"
import * as Rx from "rxjs"

export type Range = {
  min: number
  max: number
}

export type In = {
  selected: Rx.Observable<Range>
  bounds: Rx.Observable<Range>,
  unit: string,
  canvas: VNode,
}

function calc(e: MouseEvent, bounds: Range): number {
  let p = e.offsetX / (e.target as HTMLElement).clientWidth
  let r = (p: number) => bounds.min + (bounds.max - bounds.min) * p
  return r(p)
}

function percentage(e: MouseEvent): number {
  return e.offsetX / (e.target as HTMLElement).clientWidth
}

function singleRange(number: number): Range {
  return { min: number, max: number }
}
function tupleRange(a: number, b: number): Range {
  return { min: Math.min(a, b), max: Math.max(a, b) }
}

function perc(bounds: Range, number: number): number {
  return (number - bounds.min) / (bounds.max - bounds.min)
}
function percReverse(bounds: Range, number: number): number {
  return bounds.min + (bounds.max - bounds.min) * number
}

export function horizontalSlider(input: In): { vnode: Rx.Observable<VNode>, selected: Rx.Observable<Range> } {

  let activeDowns = new Rx.Subject<number>()
  let activeMoves = new Rx.Subject<number>()
  let activeUps = new Rx.Subject<number>()

  let activeSelection: Rx.Observable<Range> = activeDowns
    .switchMap(down => activeMoves
      .takeUntil(activeUps)
      .map(m => tupleRange(m, down))
      .startWith(tupleRange(down, down))
    )
    .merge(activeUps.map(up => null))
    .startWith(null)

  let completedSelection: Rx.Observable<Range> = activeDowns
    .switchMap(down => activeUps.map(m => tupleRange(m, down)))

  let vnode$ = input.bounds.combineLatest(
    input.selected,
    activeSelection,
    (bounds, selection, cursor) => ({ bounds, selection, cursor })
  )
    .map(({ bounds, cursor, selection }) => {
      let externalRange: number[] = mkRange(bounds.min, bounds.max, Math.round(Math.max(1, (bounds.max - bounds.min) / 10)))
      let externalselection: Range = selection && { max: perc(bounds, selection.max), min: perc(bounds, selection.min) }

      let lines: VNode[] = externalRange.map((divisor, i) =>
        h("div.resources-divider", { style: { left: `${i * 10}%` } })
      )
      let labels: VNode[] = externalRange.map((divisor, i) =>
        h("div.resources-divider", { style: { left: `${i * 10}%` } }, [
          h("div.resources-divider-label", `${divisor.toFixed(0)} ${input.unit}`),
        ])
      )

      let resizers = selection === null ? [] : [
        h("div.overview-grid-window-resizer", { style: { left: `${externalselection.min * 100}%` } }),
        h("div.overview-grid-window-resizer", { style: { left: `${externalselection.max * 100}%` } }),
        h("div.window-curtain-left", { style: { width: `${externalselection.min * 100}%` } }),
        h("div.window-curtain-right", { style: { width: `${100 - externalselection.max * 100}%` } }),
      ]

      let cursors = cursor === null ? [] : [
        h("div.overview-grid-window-selector", {
          style: {
            left: `${cursor.min * 100}%`,
            width: `${cursor.max * 100 - cursor.min * 100}%`,
          },
        })
      ]

      let vnode = h("div#overview-grid", [
        h("div.overview-grid-cursor-area", {
          on: {
            mousedown: (e: MouseEvent) => activeDowns.next(percentage(e)),
            mousemove: (e: MouseEvent) => activeMoves.next(percentage(e)),
            mouseup: (e: MouseEvent) => activeUps.next(percentage(e)),
          },
        }, resizers.concat(cursors)),
        input.canvas,
        h("div.resource-dividers", lines),
        h("div.timeline-grid-header", [h("div.resources-dividers-label-bar", labels)]),
      ])

      return vnode
    })

  return {
    selected: completedSelection.withLatestFrom(input.bounds, (range, bounds) => ({
      max: percReverse(bounds, range.max),
      min: percReverse(bounds, range.min),
    })),
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
