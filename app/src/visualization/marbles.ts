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

    let marbles = events.map(e => h("svg", {
      attrs: { x: `${(isNaN(this.relTime(e.time)) ? 50 : this.relTime(e.time))}%`, y: "50%" },
    }, [h("path", {
      attrs: { class: "arrow", d: "M 0 -50 L 0 48" },
    }), h("circle", {
      attrs: { class: e.type, cx: 0, cy: 0, r: 8 },
      on: { mouseover: () => debug ? debug(e) : true },
    })]))

    return h("svg", {
      attrs: {
        class: "marblediagram",
      },
    }, [
      h("line", { attrs: { class: "time", x1: "0", x2: "100%", y1: "50%", y2: "50%" } }),
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
