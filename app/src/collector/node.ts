import { render as ASCII } from "./ascii"
import { ICollector, AddObservable, AddSubscription, AddEvent } from "./logger"
import { centeredRect, centeredText } from "./shapes"
import { Visualizer } from "./visualizer"
import * as snabbdom from "snabbdom"

const h = require("snabbdom/h")

function marble() {

}

function partition<T>(array: T[], fn: (item: T, index?: number, list?: T[]) => boolean): [T[], T[]] {
  var a = [], b = []
  for (var i = 0; i < array.length; i++) {
    if (fn(array[i], i, array)) {
      a.push(array[i])
    } else {
      b.push(array[i])
    }
  }
  return [a, b]
}

export class RxFiddleNode {
  public static wrap(inner: RxFiddleNode, outer: RxFiddleNode): RxFiddleNode {
    outer.nested.push(inner)
    return outer
  }

  public instances: (Rx.Observable<any> | { id: number })[] = []
  public observers: [Rx.Observable<any> | { id: number }, Rx.Observer<any> | { id: number }, any[]][] = []

  public width = 120
  public height = 20
  public x: number
  public y: number


  public hoover: boolean = false
  public highlightIndex?: number
  public highlightId?: number
  public rendered: VNode

  public nested: RxFiddleNode[] = []

  private _subgraph: Visualizer | null

  constructor(
    public id: string,
    public name: string,
    public location: StackFrame,
    private visualizer: Visualizer
  ) { }

  public subGraph(): Visualizer {
    return this._subgraph
  }

  public createSubGraph(collector: ICollector): Visualizer {
    if (typeof this._subgraph === "undefined" || this._subgraph === null) {
      this._subgraph = new Visualizer(collector)
    }
    return this._subgraph
  }

  public addObservable(instance: Rx.Observable<any> | AddObservable) {
    this.instances.push(instance)
    return this
  }

  public addObserver(
    observable: Rx.Observable<any> | AddObservable,
    observer: Rx.Observer<any> | AddSubscription
  ): [Rx.Observable<any> | { id: number }, Rx.Observer<any> | { id: number }, any[]] {
    this.observers.push([observable, observer, []])
    this.size()
    return this.observers[this.observers.length - 1]
  }

  public migrate(observable: Rx.Observable<any>, oldNode: RxFiddleNode) {
    // migrate observable
    let [observableMigrate, observableOld] = partition(oldNode.instances, (item) => item === observable)
    oldNode.instances = observableOld
    this.instances.push.apply(this.instances, observableMigrate)
    // migrate observer
    let [observerMigrate, observerOld] = partition(oldNode.observers, (item) => item[0] === observable)
    oldNode.observers = observerOld
    this.observers.push.apply(this.observers, observerMigrate)
  }

  public size(): { w: number, h: number } {
    var extra = this._subgraph && this._subgraph.size() || { w: 0, h: 0 }
    let size = {
      w: Math.max(120, extra.w),
      h: this.observers.length * 20 + 20 + extra.h
    }
    this.width = size.w
    this.height = size.h
    return size
  }

  public setHoover(enabled: boolean) {
    this.hoover = enabled
    return this
  }

  public layout() {
    this._subgraph && this._subgraph.layout()
    this.size()
  }

  public setHighlight(index?: number) {
    this.highlightIndex = index
    this.highlightId = typeof index !== "undefined" ? (this.observers[index][1] as AddSubscription).id : undefined
    this.visualizer.highlightSubscriptionSource(this.highlightId)
    return this
  }

  public setHighlightId(patch: snabbdom.PatchFunction, id?: number) {
    this.highlightIndex = this.observers.findIndex((o) => (o[1] as AddSubscription).id === id)
    this.highlightId = id
    try {
      patch(this.rendered, this.render(patch))
    } catch (e) {
      console.warn("error while rendering", this, this.count)
    }
    return this
  }

  private count: number = 0

  public render(patch: snabbdom.PatchFunction) {
    let streams = ASCII(this.observers.map(_ => _[2]))
      .map((stream, i) => centeredText(stream || "?", {
        fill: this.highlightIndex === i ? "red" : "black",
        y: this.line(i + 1), "font-family": "monospace",
      }, {
          on: {
            mouseout: () => patch(result, this.setHighlight().render(patch)),
            mouseover: () => patch(result, this.setHighlight(i).render(patch)),
          },
        }))
    let result = h("g", {
      attrs: {
        height: this.height,
        transform: `translate(${this.x},${this.y})`,
        width: this.width,
      },
      on: {
        click: () => console.log(this),
        mouseout: () => patch(result, this.setHoover(false).render(patch)),
        mouseover: () => patch(result, this.setHoover(true).render(patch)),
      },
    }, [
      this.hoover ? this.dialog() : undefined,
      centeredRect(this.width, this.height, {
        rx: 10, ry: 10,
        stroke: this.hoover || typeof this.highlightId !== "undefined" ? "red" : "black",
      }),
      centeredText(this.name, { y: this.line(0) }),
      // subgraph
      h("g", {
        attrs: { transform: `translate(${this.width / -2}, ${this.line(this.observers.length) + 10})` },
      }, [
        this._subgraph && this._subgraph.render(),
      ].filter(id => id)),
    ].concat(streams).filter(id => id))
    this.rendered = result
    this.count++
    return result
  }

  private line(i: number) {
    return -this.height / 2 + i * 20 + 10
  }

  private dialog() {
    let width = 200
    let height = 200
    let triangle = `M ${width / -2 - 5} 0 l 5 -5 l 0 10 Z`
    return h("g", {
      attrs: { transform: `translate(${this.width / 2 + width / 2 + 5},${0})`, width, height },
    }, [
        h("path", { attrs: { d: triangle, fill: "black" } }),
        centeredRect(width, height, { rx: 10, ry: 10, fill: "white", "z-index": 10 }),
      ])
  }

}