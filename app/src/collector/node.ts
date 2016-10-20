import * as snabbdom from "snabbdom";
import { centeredRect, centeredText } from "./shapes";
const h = require("snabbdom/h");

export class RxFiddleNode {
  public instances: Rx.Observable<any>[] = [];
  public observers: [Rx.Observable<any>, Rx.Observer<any>, any[]][] = [];

  constructor(
    public id: string,
    public name: string,
    public location: StackFrame
  ) { }

  public add(instance: Rx.Observable<any>) {
    this.instances.push(instance)
    return this
  }

  public addObserver(observable: Rx.Observable<any>, observer: Rx.Observer<any>): [Rx.Observable<any>, Rx.Observer<any>, any[]] {
    let tuple: [Rx.Observable<any>, Rx.Observer<any>, any[]] = [observable, observer, []]
    this.observers.push(tuple)
    return tuple
  }

  public width = 120;
  public height = 40;
  public x: number;
  public y: number;

  public hoover: boolean = false;
  public rendered: VNode;

  public setHoover(enabled: boolean) {
    this.hoover = enabled;
    return this;
  }

  public render(patch: snabbdom.PatchFunction) {
    var result = h("g", {
      attrs: { transform: `translate(${this.x},${this.y})` },
      on: {
        click: () => console.log(this),
        mouseover: () => patch(result, this.setHoover(true).render(patch)),
        mouseout: () => patch(result, this.setHoover(false).render(patch))
      },
    }, [
      centeredRect(this.width, this.height, { rx: 10, ry: 10 }),
      centeredText(this.name, { y: -8 }),
      centeredText(`
        o: ${this.observers.length}, 
        e: ${this.observers.reduce((p, o) => o[2].length, 0)}
      `, { y: 8 }),
      // this.dialog()
      // this.hoover ? this.dialog() : undefined
    ].filter(id => id));
    this.rendered = result;
    return result;
  }

  private dialog() {
    let _w = 200, _h = 200;
    let triangle = `M ${_w / -2 - 5} 0 l 5 -5 l 0 10 Z`;
    return h("g", {
      attrs: { transform: `translate(${this.width / 2 + _w / 2 + 5},${0})`, width: _w, height: _h }
    }, [
        h("path", { attrs: { d: triangle, fill: "black" } }),
        centeredRect(_w, _h, { rx: 10, ry: 10, fill: "white", "z-index": 10 }),
      ]);
  }
}