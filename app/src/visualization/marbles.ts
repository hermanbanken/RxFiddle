import { IEvent } from "../collector/event"
import { EventLabel, NodeLabel } from "../collector/logger"
import { GraphEdge } from "./index"
import { h } from "snabbdom/h"
import { VNode } from "snabbdom/vnode"

function isEvent(n: any): n is IEvent {

  return "time" in n && "type" in n &&
    n.type === "next" ||
    n.type === "error" || n.type === "compnete" ||
    n.type === "subscribe" || n.type === "dispose"
}

export class MarbleCoordinator {
  private min: number
  private max: number

  // Calc bounds
  public add(edges: (EventLabel | IEvent)[]): void {
    let events = edges.map(_ => ((_ as EventLabel).event || _) as IEvent)
    let times = events.map(e => e.time)
    this.min = times.reduce((m, n) => typeof m !== "undefined" ? Math.min(m, n) : n, this.min)
    this.max = times.reduce((m, n) => typeof m !== "undefined" ? Math.max(m, n) : n, this.max)
  }

  // Rendering
  public render(edges: (EventLabel | IEvent)[], debug?: (...arg: any[]) => void): VNode {
    let events = edges.map(_ => ((_ as EventLabel).event || _) as IEvent)

    let timespan = [
      events.find(e => e.type === "subscribe"),
      events.find(e => e.type === "dispose" || e.type === "complete"),
    ].map((_, i) => _ ? this.relTime(_.time) : (i === 0 ? 0 : 100))

    let marbles = events.filter(e => e.type !== "dispose").map(e => {
      let arrow = h("path", {
        attrs: {
          class: "arrow",
          d: ["next", "complete", "error"].indexOf(e.type) >= 0 ?
            "M 0 -30 L 0 28" :
            "M 0 30 L 0 -28",
        },
      })
      let circle = h("circle", {
        attrs: { class: e.type, cx: 0, cy: 0, r: 7 },
        on: { mouseover: () => debug ? debug(e) : true },
      })

      let content: VNode[] = []

      switch (e.type) {
        case "error":
          content = [h("path", {
            attrs: { class: "error", d: "M 4 -10 L -4 10 M 4 10 L -4 -10" },
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
              attrs: { class: "higher next", x: -12, width: 32, y: -12, height: 24 },
              on: { mouseover: () => debug ? debug(e) : true },
            })]
            break
          }
        default: content = [arrow, circle]
      }

      return h("svg", {
        attrs: { x: `${(isNaN(this.relTime(e.time)) ? 50 : this.relTime(e.time))}%`, y: "50%" },
      }, content)
    })

    return h("svg", {
      attrs: {
        class: "marblediagram",
      },
    }, [
      h("line", { attrs: { class: "time", x1: "0", x2: "100%", y1: "50%", y2: "50%" } }),
      h("line", { attrs: { class: "active", x1: `${timespan[0]}%`, x2: `${timespan[1]}%`, y1: "50%", y2: "50%" } }),
    ].concat(marbles).concat(defs()))
  }

  private relTime(t: number): number {
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
