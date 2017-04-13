import h from "snabbdom/h"
import { Hooks } from "snabbdom/hooks"
import { VNode } from "snabbdom/vnode"

class Resizer {
  public id: string
  public isVertical: boolean
  public dragSurface: VNode
  public targets: VNode[]
  public element: HTMLDivElement
  constructor(id: string, isVertical: boolean, dragSurface: VNode) {
    this.id = id
    this.isVertical = isVertical
    this.dragSurface = dragSurface
  }
  public makeHooks(): Hooks {
    return { update: (p, next) => this.element = next.elm as HTMLDivElement }
  }
  public makeOn(i: number): any {
    return {
      mousedown: (initial: MouseEvent) => {
        let width = this.measure(i);
        (this.dragSurface.elm as HTMLElement).style.display = "block"
        let up = Rx.Observable.fromEvent<MouseEvent>(window, "mouseup")
        Rx.Observable.fromEvent<MouseEvent>(window, "mousemove")
          .takeWhile(e => e.which !== 0)
          .takeUntil(up)
          .map(e => initial.clientX - e.clientX)
          .map(delta => width - delta)
          .subscribe(w => this.resize(i, w), e => { /* */ }, () => {
            (this.dragSurface.elm as HTMLElement).style.display = "none"
          })
      },
    }
  }
  public measure(i: number): number {
    let index = i * 2 - 1
    let el = this.element.childNodes[index] as HTMLDivElement;
    return el.clientWidth
  }
  public resize(i: number, width: number): void {
    let index = i * 2 - 1
    let el = this.element.childNodes[index] as HTMLDivElement;
    el.style.width = width + "px"
  }
}

function resizer(id: string, directionIsV: boolean, ...targets: VNode[]): VNode {
  let surface = h("div.dragsurface", { style: { cursor: directionIsV ? "ns-resize" : "ew-resize", display: "none" } })
  let resizer = new Resizer(id, directionIsV, surface)
  let row = [surface]
  for (let i = 0; i < targets.length; i++) {
    if (i > 0) {
      row.push(h("div.resizer", { on: resizer.makeOn(i) }))
    }
    row.push(targets[i])
  }
  return h(
    directionIsV ? "div.flexy.flexy-v.resize-panel" : "div.flexy.resize-panel",
    { hook: resizer.makeHooks() },
    row
  )
}

function vertical(id: string, ...targets: VNode[]): VNode {
  return resizer(id, true, ...targets)
}
function horizontal(id: string, ...targets: VNode[]): VNode {
  return resizer(id, false, ...targets)
}

export default {
  h: horizontal,
  v: vertical,
}
