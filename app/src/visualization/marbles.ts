import { IEvent } from "../collector/event"
import { EventLabel } from "../collector/logger"
import { IObserverTree } from "../oct/oct"
import { UIEvent } from "./render"
import { h } from "snabbdom/h"
import { VNode } from "snabbdom/vnode"

function timeSelector(e: IEvent) {
  return e.timing && e.timing.tick
}
function clockSelector(e: IEvent) {
  return e.timing && e.timing.clock
}

function name(e: IEvent): string {
  if (clockSelector(e) < 14e9) {
    return `${e.type} @ ${clockSelector(e)}`
  }
  return `${e.type} @ ${new Date(clockSelector(e))} / ${timeSelector(e)}`
}

function tooltip(e: IEvent, uiEvents: (e: UIEvent) => void) {
  switch (e.type) {
    case "error":
      return h("span", [
        name(e),
        h("br"),
        h("pre", e.error.stack.toString() || e.error.toString()),
      ])
    case "next":
      if (typeof e.value === "string") {
        return h("span", [name(e), h("br"), h("pre", e.value)])
      } else if (typeof e.value === "object") {
        let val = e.value as any
        if ("type" in val && "id" in val) {
          let handlers = {
            focus: () => uiEvents({ observable: val.id, tick: timeSelector(e), type: "higherOrderClick" }),
            mouseover: () => uiEvents({ observable: val.id, tick: timeSelector(e), type: "higherOrderHoover" }),
          }
          return h("span", [
            name(e),
            h("br"),
            h("a.type-ref", { attrs: { role: "button" }, on: handlers }, val.type),
          ])
        } else {
          return h("span", [name(e), h("br"), JSON.stringify(val)])
        }
      }
    case "complete":
    case "dispose":
    case "subscribe":
      return h("span", name(e))
    default:
      return h("span", [
        h("span", { style: { "white-space": "nowrap" } }, name(e)),
        h("br"),
        JSON.stringify(e),
      ])
  }
}

export class MarbleCoordinator {
  private min: number
  private max: number
  private timeSelector: (e: IEvent) => number

  constructor(timeSelector: (e: IEvent) => number = _ => _.timing && _.timing.tick) {
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
    debug?: (...arg: any[]) => void
  ): VNode {
    let events = edges.map(_ => ((_ as EventLabel).event || _) as IEvent)

    let timespan = [
      events.find(e => e.type === "subscribe"),
      events.find(e => e.type === "dispose" || e.type === "complete" || e.type === "error"),
    ].map((_, i) => _ ? this.relTime(_) : (i === 0 ? 0 : 100))

    let marbles = events.filter(e => e.type !== "dispose").map((e, index) => {
      let arrow = h("path", {
        attrs: {
          class: "arrow",
          d: ["next", "complete", "error"].indexOf(e.type) >= 0 ?
            "M 0 -30 L 0 30" :
            "M 0 30 L 0 -30",
        },
      })

      let handlers = {
        click: () => uiEvents({ subscription: observer.id, tick: this.timeSelector(e), type: "marbleClick" }),
        focus: () => uiEvents({ subscription: observer.id, tick: this.timeSelector(e), type: "marbleHoover" }),
        mouseover: () => uiEvents({ subscription: observer.id, tick: this.timeSelector(e), type: "marbleHoover" }),
      }

      let circle = h("circle", {
        attrs: { class: e.type, cx: 0, cy: 0, r: 7 },
      })

      let content: VNode[] = []

      switch (e.type) {
        case "error":
          content = [h("path", {
            attrs: { class: "error", d: "M 4 -8 L -4 8 M 4 8 L -4 -8" },
            on: { mouseover: () => debug ? debug(e) : true },
          })]
          break
        case "subscribe":
          content = []
          break
        case "complete":
          content = [h("path", {
            attrs: { class: "complete", d: "M 0 -10 L 0 10" },
            on: { mouseover: () => debug ? debug(e) : true },
          })]
          break
        case "next":
          if (typeof e.value === "object") {
            content = [arrow, h("rect", {
              attrs: { class: "higher next", height: 24, width: 32, x: -12, y: -12 },
              on: { mouseover: () => debug ? debug(e) : true },
            })]
            break
          }
        default: content = [arrow, circle]
      }

      let left = isNaN(this.relTime(e)) ? 50 : this.relTime(e)

      return {
        html: h(`a.marbleevent.${left > 50 ? "rtl" : "ltr"}`, {
          attrs: { href: "javascript:undefined", role: "button" },
          on: handlers,
          style: { left: `${left}%` },
          tabIndex: { index: this.timeSelector(e) },
          key: `marble-${observer.id}-${e.type}@${this.timeSelector(e)}`,
        }, [tooltip(e, uiEvents)]),
        svg: h("svg", {
          attrs: { x: `${left}%`, y: "50%" },
        }, content),
      }
    })

    return h("div.marblediagram.layered", { tabIndex: { group: "row" } }, [
      h("div.bg", [h("svg", [
        h("line", { attrs: { class: "time", x1: "0", x2: "100%", y1: "50%", y2: "50%" } }),
        h("line", { attrs: { class: "active", x1: `${timespan[0]}%`, x2: `${timespan[1]}%`, y1: "50%", y2: "50%" } }),
        ...marbles.map(_ => _.svg),
        ...defs(),
      ])]),
      h("div.fg", marbles.map(_ => _.html)),
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
