import { elvis } from "../collector/collector"
import TypedGraph from "../collector/typedgraph"
import { IObservableTree, IObserverTree, ISchedulerInfo } from "../oct/oct"
import { ViewState } from "./index"
import { In as RenderInput } from "./render"
import { horizontalSlider } from "./timeGrid"
import { UIEvent } from "./uievent"
import * as Rx from "rxjs"
import h from "snabbdom/h"
import { VNode } from "snabbdom/vnode"

let CanvasHooks = {
  insert: (next: VNode) => {
    let cvs = next.elm as HTMLCanvasElement
    cvs.width = cvs.clientWidth
    cvs.height = cvs.clientHeight
  },
  update: (old: VNode, next: VNode) => {
    if (typeof next.data.bins === "function") {
      let elm = next.elm as HTMLCanvasElement
      let bins: Uint8Array = next.data.bins(elm.width)
      let ctx = elm.getContext("2d")
      ctx.clearRect(0, 0, elm.width, elm.height)
      bins.forEach((v, i) => {
        ctx.fillStyle = "#32cd32"
        ctx.fillRect(i, elm.height - v, 1, v)
      })
    }
  },
}

export function time(input: RenderInput): {
  vnode: Rx.Observable<VNode>,
  uievent: Rx.Observable<UIEvent>
} {
  let events = new Rx.Subject<UIEvent>()

  let vnode = input.switchMap(({ graphs, viewState, time }) => {
    graphs.subscriptions.nodes().flatMap(n => graphs.subscriptions.node(n).events).map(_ => _.timing)

    let activeId = highlightScheduler(graphs.main, viewState) || time.defaultId()

    let canvas = h("canvas.resources", { bins: (w: number) => time.bins(w, activeId), hook: CanvasHooks })

    let slider = horizontalSlider({
      bounds: Rx.Observable.of({ max: time.max(activeId), min: time.min(activeId) }),
      canvas,
      selected: Rx.Observable.of(viewState.timeRange || null),
      unit: time.unit(activeId),
    })

    slider.selected
      .map(range => ({ max: range.max, min: range.min, scheduler: activeId, type: "timeRange" }) as UIEvent)
      .subscribe(events)

    let schedulers = Rx.Observable.of(time.schedulers.map(scheduler => {
      let active = scheduler.id === activeId
      return h(
        `div.scheduler.toolbar-pill${active ? ".active" : ""}`,
        { on: { click: () => events.next({ id: active ? undefined : scheduler.id, type: "scheduler" }) } },
        scheduler.name
      )
    }))

    return slider.vnode.combineLatest(schedulers, (slidervn, scheds) =>
      h("div", { style: { flex: "0" } }, [
        h("div.toolbar.schedulers", scheds),
        h("div.rel", { style: { height: "80px" } }, [slidervn]),
      ])
    )
  })

  return {
    uievent: events,
    vnode,
  }
}

function highlightScheduler(
  input: TypedGraph<IObservableTree | IObserverTree, any>,
  viewState: ViewState
): string {
  if (viewState.scheduler) { return viewState.scheduler }
  let node = viewState.hoover ? input.node(viewState.hoover) as IObservableTree : undefined
  if (node && node.scheduler) {
    return node.scheduler.id
  }
  return
}

