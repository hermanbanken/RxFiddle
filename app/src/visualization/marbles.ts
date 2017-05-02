// tslint:disable:max-line-length
import { IEvent } from "../collector/event"
import { EventLabel } from "../collector/logger"
import { IObservableTree, IObserverTree } from "../oct/oct"
import { ViewState } from "./index"
import { UIEvent } from "./render"
import { groupBy } from "lodash"
import { h } from "snabbdom/h"
import { VNode } from "snabbdom/vnode"

function timeSelector(e: IEvent) {
  return e.timing && e.timing.clocks.tick
}
function name(e: IEvent, clockSelector: (e: IEvent) => number): string {
  return `${e.type} @ ${clockSelector(e)}`
}

function tooltip(event: IEvent, uiEvents: (e: UIEvent) => void, clockSelector: (e: IEvent) => number, simultaneous: IEvent[]) {
  return h("span", (simultaneous || [event]).map((e: IEvent) => {
    switch (e.type) {
      case "error":
        return h("div", [
          name(e, clockSelector),
          h("br"),
          h("pre.user-select", e.error.stack.toString() || e.error.toString()),
        ])
      case "next":
        if (typeof e.value === "string") {
          return h("div", [name(e, clockSelector), h("br"), h("pre.user-select", e.value)])
        } else if (typeof e.value === "object") {
          let val = e.value as any
          if ("type" in val && "id" in val) {
            let handlers = {
              focus: () => uiEvents({ observable: val.id, tick: timeSelector(e), type: "higherOrderClick" }),
              mouseover: () => uiEvents({ observable: val.id, tick: timeSelector(e), type: "higherOrderHoover" }),
            }
            return h("div", [
              name(e, clockSelector),
              h("br"),
              h("a.type-ref", { attrs: { role: "button" }, on: handlers }, val.type),
            ])
          } else {
            return h("div", [name(e, clockSelector), h("br"), JSON.stringify(val)])
          }
        }
      case "complete":
      case "dispose":
      case "subscribe":
        return h("div", name(e, clockSelector))
      default:
        return h("div", [
          h("span", { style: { "white-space": "nowrap" } }, name(e, clockSelector)),
          h("br"),
          JSON.stringify(e),
        ])
    }
  }))
}

export class MarbleCoordinator {
  private min: number
  private max: number
  private timeSelector: (e: IEvent) => number

  constructor(timeSelector: (e: IEvent) => number = _ => _.timing && _.timing.clocks.tick) {
    this.timeSelector = timeSelector
  }

  public set(min: number, max: number) {
    this.min = min
    this.max = max
  }

  // Calc bounds
  public add(edges: (EventLabel | IEvent)[]): void {
    let events = edges.map(_ => ((_ as EventLabel).event || _) as IEvent)
    let times = events.map(this.timeSelector)
    this.min = times.reduce((m, n) => typeof m !== "undefined" ? Math.min(m, n) : n, this.min)
    this.max = times.reduce((m, n) => typeof m !== "undefined" ? Math.max(m, n) : n, this.max)
  }

  // Rendering
  public render(
    observer: IObserverTree,
    edges: (EventLabel | IEvent)[],
    uiEvents: (e: UIEvent) => void,
    debug?: (...arg: any[]) => void,
    findSubscription?: (id: string) => IObserverTree,
    viewState?: ViewState,
    coloring?: (node: string) => string
  ): VNode {
    let events = edges.map(_ => ((_ as EventLabel).event || _) as IEvent)

    let timespan = makeTimespan.call(this, events)

    // Background denoting other input subscription (like flatMap source)
    let bySource = groupBy(events
      .filter(e => e.type !== "subscribe" && e.type !== "dispose"),
      (i) => i.source
    )
    let bgs = Object.keys(bySource).map(key => bySource[key]).map(es => {
      let source = findSubscription(es[0].source)
      let sourceBounds = source && source.sink &&
        source.sink.id !== observer.id &&
        makeTimespan.call(this, source.events)
      let bg = sourceBounds && sourceBounds.length === 2 && h("div.source-timing", {
        style: {
          left: `${sourceBounds[0]}%`,
          right: `${100 - sourceBounds[1]}%`,
        },
      })
      return bg
    }).filter(bg => typeof bg === "object" && bg.data)

    let someHoover = events.some(e => hasHooverSource(viewState, e))

    let simultaneous: { [id: string]: IEvent[] } = groupBy(events, e => timeSelector(e))

    let marbles = events.map((e, index) => {

      let handlers = {
        click: () => uiEvents({ marble: e, subscription: observer.id, type: "marbleClick" }),
        focus: () => uiEvents({ marble: e, subscription: observer.id, type: "marbleHoover" }),
        mouseout: () => uiEvents({ type: "marbleHooverEnd" }),
        mouseover: () => uiEvents({ marble: e, subscription: observer.id, type: "marbleHoover" }),
      }

      let content: VNode[] = eventBody(e, coloring)

      let left = isNaN(this.relTime(e)) ? 50 : this.relTime(e)

      let eHooverClass = someHoover ? hooverClass(viewState, e) : ""

      return {
        html: h(`a.marbleevent.${left > 50 ? "rtl" : "ltr"}.${eHooverClass}`, {
          attrs: { href: "javascript:undefined", role: "button" },
          key: `marble-${observer.id}-${e.type}@${this.timeSelector(e)}-${index}`,
          on: handlers,
          style: { left: `${left}%` },
          tabIndex: { index: this.timeSelector(e) },
        }, [tooltip(e, uiEvents, this.timeSelector, simultaneous[this.timeSelector(e).toString(10)])]),
        svg: h("svg", {
          attrs: { class: eHooverClass, x: `${left}%`, y: "50%" },
        }, content),
      }
    })

    return h("div.marblediagram.layered", { tabIndex: { group: "row" } }, [
      h("div.bg", [
        ...bgs,
        h("svg", [
          h("line", { attrs: { class: "time", x1: "0", x2: "100%", y1: "50%", y2: "50%" } }),
          h("line", { attrs: { class: "active", x1: `${timespan[0]}%`, x2: `${timespan[1]}%`, y1: "50%", y2: "50%" } }),
          ...marbles.map(_ => _.svg),
          ...defs(),
        ]),
      ]),
      h("div.fg", marbles.map(_ => _.html).filter(_ => typeof _ !== "undefined")),
    ])
  }

  public relTime(t: number | IEvent): number {
    if (typeof t !== "number") {
      t = this.timeSelector(t)
    }
    return (t - this.min) / (this.max - this.min) * 95 + 2.5
  }

}

const defs: () => VNode[] = () => [h("defs", [
  h("marker", {
    attrs: {
      id: "arrow",
      markerHeight: 10,
      markerUnits: "strokeWidth",
      markerWidth: 10,
      orient: "auto",
      overflow: "visible",
      refx: 0, refy: 3,
    },
  }, [h("path", { attrs: { d: "M-4,-2 L-4,2 L0,0 z", fill: "inherit" } })]),
  h("marker", {
    attrs: {
      id: "arrow-reverse",
      markerHeight: 10,
      markerUnits: "strokeWidth",
      markerWidth: 10,
      orient: "auto",
      overflow: "visible",
      refx: 0, refy: 3,
    },
  }, [h("path", { attrs: { d: "M0,0 L4,2 L4,-2 z", fill: "blue" } })]),
])]

function unique<T>(list: T[]): T[] {
  let got = [] as T[]
  list.forEach(i => {
    if (got.indexOf(i) < 0) {
      got.push(i)
    }
  })
  return got
}

function hooverClass(viewState: ViewState, e: IEvent) {
  if (hasHooverSource(viewState, e)) {
    return "hoover-source"
  } else {
    return "hoover-other"
  }
}

function hasHooverSource(viewState: ViewState, e: IEvent): boolean {
  if (typeof viewState === "undefined" || typeof viewState.hooverSelection === "undefined") {
    return false
  }
  let h = viewState.hooverSelection
  switch (h.type) {
    case "marbleHoover":
      if (h.marble.source === e.source) {
        return true
      }
    default:
      return false
  }
}

function endEvent(e: IEvent) {
  return e.type === "error" || e.type === "complete" || e.type === "dispose"
}
function subscriptionLevelEvent(e: IEvent) {
  return e.type === "subscribe" || e.type === "dispose"
}

function makeTimespan(this: MarbleCoordinator, events: IEvent[]) {
  return [
    events.find(e => e.type === "subscribe"),
    events.find(e => e.type === "dispose" || e.type === "complete" || e.type === "error"),
  ]
    .map((_, i) => _ ? this.relTime(_) : (i === 0 ? 0 : 100))
    .map((_, i) => isNaN(_) ? (i === 0 ? 0 : 100) : _)
}

function eventBody(e: IEvent, coloring?: (node: string) => string) {
  let arrow = h("path", {
    attrs: {
      class: "arrow",
      d: ["next", "complete", "error"].indexOf(e.type) >= 0 ?
        "M 0 -30 L 0 30" :
        "M 0 30 L 0 -30",
    },
  })

  let circle = h(`circle`, {
    attrs: {
      class: `${e.type} source-${e.source}`,
      cx: 0, cy: 0, r: 7,
    },
  })

  let content: VNode[] = []

  switch (e.type) {
    case "error":
      content = [h("path", {
        attrs: { class: "error", d: "M 4 -8 L -4 8 M 4 8 L -4 -8" },
      })]
      break
    case "dispose":
    case "subscribe":
      content = []
      break
    case "complete":
      content = [h("path", {
        attrs: { class: "complete", d: "M 0 -10 L 0 10" },
      })]
      break
    case "next":
      if (typeof e.value === "object") {
        content = [arrow, h("rect", {
          attrs: {
            class: "higher next",
            fill: coloring((e.value as any).id) || "white",
            height: 24, width: 32, x: -12, y: -12,
          },
        })]
        break
      }
    default: content = [arrow, circle]
  }

  return content
}
