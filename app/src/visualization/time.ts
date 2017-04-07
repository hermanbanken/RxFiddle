import { elvis } from "../collector/collector"
import TypedGraph from "../collector/typedgraph"
import { IObservableTree, IObserverTree, ISchedulerInfo } from "../oct/oct"
import { ViewState } from "./index"
import { In as RenderInput } from "./render"
import { horizontalSlider } from "./timeGrid"
import { UIEvent } from "./uievent"
import h from "snabbdom/h"
import { VNode } from "snabbdom/vnode"

export function time(input: RenderInput): {
  vnode: Rx.Observable<VNode>,
  uievent: Rx.Observable<UIEvent>
} {
  // input.map(_ => _.hoover && _.hoover.scheduler.id)

  let vnode = input.flatMap(({ graphs, viewState }) => {
    graphs.subscriptions.nodes().flatMap(n => graphs.subscriptions.node(n).events).map(_ => _.timing)

    let slider = horizontalSlider({
      bounds: Rx.Observable.just({ max: 100, min: 0 }),
      selected: Rx.Observable.just({ max: 60, min: 40 }),
    })

    let schedulers = input.map(_ => _.graphs.schedulers.map(scheduler => {
      let active = highlightUsage(_.graphs.main, _.viewState, scheduler)
      return h(`div.scheduler.toolbar-pill${active ? ".active" : ""}`, scheduler.name)
    }))

    return slider.vnode.combineLatest(schedulers, (slidervn, scheds) =>
      h("div", { style: { flex: "0" } }, [
        h("div.toolbar.schedulers", scheds),
        h("div.rel", { style: { height: "80px" } }, [slidervn]),
      ])
    )
  })

  return {
    uievent: Rx.Observable.empty<UIEvent>(),
    vnode,
  }
}

function highlightUsage(
  input: TypedGraph<IObservableTree | IObserverTree, any>,
  viewState: ViewState,
  scheduler: ISchedulerInfo
): boolean {
  let node = viewState.hoover ? input.node(viewState.hoover) as IObservableTree : undefined
  if (node && node.scheduler) {
    return node.scheduler.id === scheduler.id
  }
  return false
}
