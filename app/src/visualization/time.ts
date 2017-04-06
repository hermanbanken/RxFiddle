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
  let vnode = input.flatMap(({ graphs, viewState }) => {
    let slider = horizontalSlider({
      bounds: Rx.Observable.just({ max: 100, min: 0 }),
      selected: Rx.Observable.just({ max: 60, min: 40 }),
    })

    let schedulers = input.map(_ => _.graphs.schedulers.map(scheduler =>
      h("div.scheduler.toolbar-pill", scheduler.name)
    ))

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
