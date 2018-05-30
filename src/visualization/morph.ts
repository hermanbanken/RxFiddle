import { VNode, VNodeData } from "snabbdom/vnode"
declare module "snabbdom/vnode" {
  interface VNodeData {
    morph?: any
    attrs?: any
  }
}

let morphModule = {
  prepare: (oldVNode: VNode, vnode: VNode) => {
    if (typeof oldVNode.data.attrs === "object" && typeof vnode.data.attrs === "object") {
      if (typeof oldVNode.data.attrs.d === "string" && typeof vnode.data.attrs.d === "string") {
        prepare(oldVNode, vnode)
      }
    }
  },
  update: (oldVNode: VNode, vnode: VNode) => {
    if (typeof vnode.data.morph === "object") {
      if (typeof vnode.data.morph["--final-d"] === "string") {
        keepEdgePointsEqual(oldVNode, vnode)
      }
    }
  },
}

export default morphModule

let raf = (typeof window !== "undefined" && window.requestAnimationFrame) || setTimeout
let nextFrame = (fn: FrameRequestCallback) => { raf(() => { raf(fn) }) }

function prepare(oldVNode: VNode, vnode: VNode) {
  let elm = oldVNode.elm as Element
  if (!elm) {
    console.warn("Prepatch without vnode element", oldVNode, vnode)
    return
  }
  let oldAttrs = (oldVNode.data as VNodeData).attrs || {}
  let attrs = (vnode.data as VNodeData).attrs || {}
  let morph = (vnode.data as VNodeData).morph = {} as any

  let od = oldAttrs.d as string
  let nd = attrs.d as string
  if (od === nd) {
    return
  }
  let ocs = svgControls(od).join("")
  let ncs = svgControls(nd).join("")
  if (ocs === ncs) {
    return
  }

  let expand = Math.abs(ocs.length - ncs.length)
  if (ocs.length < ncs.length) {
    // Expand
    let path = Path.parse(od).expand(expand).toString()
    morph["--current-d"] = od
    morph["--immediate-d"] = path
    morph["--final-d"] = attrs.d
    attrs.d = path
  } else {
    // Contract
    let path = Path.parse(nd).expand(expand).toString()
    morph["--current-d"] = od
    morph["--nextframe-d"] = path
    morph["--final-d"] = nd
    attrs.d = od
  }
}

/**
 * Ensures Edges keep the same amount of points.
 * Animation is only possible if the d attributes contains an equal amount of control points.
 */
function keepEdgePointsEqual(oldVNode: VNode, vnode: VNode) {
  let elm = vnode.elm as Element
  let morph = (vnode.data as VNodeData).morph || {}
  let attrs = (vnode.data as VNodeData).attrs || {}

  let final = morph["--final-d"]
  if (typeof morph["--immediate-d"] === "string") {
    if ((elm as any).morphListener) {
      elm.removeEventListener("transitionend", (elm as any).morphListener)
    }
    nextFrame(() => {
      elm.setAttribute("d", final)
      attrs.d = final
    })
  } else {
    let listener = (ev: TransitionEvent) => {
      if (ev.target !== elm) {
        return
      }
      elm.setAttribute("d", final)
      elm.removeEventListener("transitionend", listener)
    }
    elm.addEventListener("transitionend", listener)
    elm.setAttribute("d", morph["--nextframe-d"]);
    (elm as any).morphListener = listener
    nextFrame(() => {
      attrs.d = final
    })
  }
  delete vnode.data.morph
}

export class Point {
  public x: number
  public y: number
  constructor(x: number, y: number) {
    this.x = x
    this.y = y
  }
  public toString() {
    return `${this.x} ${this.y}`
  }
  public delta(other: Point): { dx: number, dy: number } {
    return { dx: other.x - this.x, dy: other.y - this.y }
  }
}

export class Path {
  public static parse(path: string): Path {
    return new Path(Segment.parsePath(path))
  }

  public segments: Segment[]

  constructor(segments: Segment[]) {
    this.segments = segments
  }
  public toString() {
    return this.segments.join(" ")
  }

  public expand(adjust: number): Path {
    let output = this.segments.map((s, i) => i === this.segments.length - 1 ? s.expand(adjust) : s)
    return new Path(output)
  }
}

export class Segment {

  public static parsePath(path: string): Segment[] {
    let ms = path.match(/[MLHVZCSQTA](([\s,]*([\d\.\_]+)+)*)/ig)
    let ss = ms.map(match => {
      let ps = match.substr(1).split(/[\s,]+/).filter(p => p.length > 0).map(n => parseFloat(n))
      return new Segment(match[0], ps)
    })
    return ss.reduce((p, n) => Segment.addOrConcat(p, n), [])
  }

  public static addOrConcat(list: Segment[], next: Segment): Segment[] {
    let last = tail(list)
    return last ? list.slice(0, list.length - 1).concat(last.combine(next)) : [next]
  }

  public modifier: string
  public points: number[]

  public get x(): number {
    return this.points[this.points.length - 2]
  }

  public get y(): number {
    return this.points[this.points.length - 1]
  }

  public get ps(): Point[] {
    let arr = []
    for (let i = 0; i + 1 < this.points.length; i += 2) {
      arr.push(new Point(this.points[i], this.points[i + 1]))
    }
    return arr
  }

  public get isAbsolute(): boolean {
    return this.modifier.toUpperCase() === this.modifier
  }

  public get deltas(): { dx: number, dy: number }[] {
    switch (this.modifier) {
      case "M":
      case "L":
      case "C":
        return sliced(this.ps, 2, 1)
          .map(([a, b]) => ({ dx: b.x - a.x, dy: b.y - a.y }))
      case "m":
      case "l":
      case "c":
        return this.ps.map(({ x, y }) => ({ dx: x, dy: y }))
      default: throw new Error("deltas() not implemented for " + this.modifier)
    }
  }

  public get ratios(): number[] {
    return this.deltas
      .filter(v => !(v.dx === 0 && v.dy === 0))
      .map(v => v.dx / v.dy)
  }

  public get isStraight(): boolean {
    if (this.points.length === 2) { return true }
    let ratio = this.ratios
      .reduce((p, n) => typeof p === "number" ? p === n && n : (typeof p === "undefined" ? n : false), undefined)
    return typeof ratio === "number"
  }

  public get multiplicity(): number {
    switch (this.modifier) {
      case "M":
      case "m":
      case "L":
      case "l":
        return 1
      case "Q":
      case "q":
        return 2
      case "C":
      case "c":
        return 3
      default: return 0
    }
  }

  public get slack(): number {
    return Math.max(0, this.points.length / (this.multiplicity * 2) - 1)
  }

  constructor(modifier: string, points: number[]) {
    this.modifier = modifier
    this.points = points
  }

  public expand(adjust: number): Segment {
    let ps = this.points.slice(0)
    // Duplicate end n times
    let arr = Array.apply(null, { length: this.multiplicity * adjust }).flatMap((_: any) => ps.slice(-2))
    ps.splice(ps.length, 0, ...arr)
    return new Segment(this.modifier, ps)
  }

  public toString() {
    switch (this.modifier) {
      case "c":
      case "C":
        return sliced(this.ps, 3, 3).map(ps => "C " + ps.join(",")).join(" ")
      default: return this.ps.map(p => `${this.modifier} ${p}`).join(" ")
    }
  }

  public combine(other: Segment): Segment[] {
    if (other.modifier === this.modifier) {
      let deltas: { dx: number, dy: number }[]
      if (other.isAbsolute) {
        deltas = this.deltas.concat([tail(this.ps).delta(other.ps[0])]).concat(other.deltas)
      } else {
        deltas = this.deltas.concat(other.deltas)
      }
      let rs = ratio(deltas)
      if (typeof rs !== "boolean") {
        return [new Segment(this.modifier, this.points.concat(other.points))]
      }
    }
    return [this, other]
  }

}

function ratio(deltas: { dx: number, dy: number }[]): number | undefined | false {
  if (deltas.length === 1) { return undefined }
  let ratios = deltas
    .filter(v => !(v.dx === 0 && v.dy === 0))
    .map(v => v.dx / v.dy)
  return ratios
    .reduce((p, n) => typeof p === "number" ? p === n && n : (typeof p === "undefined" ? n : false), undefined)
}

const SVGControlChars = "MLHVZCSQTA"
const SVGControls = new RegExp(`^[${SVGControlChars}]{1}$`, "i")
function svgControls(d: string): string[] {
  return d.split("").filter(c => SVGControls.test(c))
}

function tail<T>(list: T[]): T {
  return list[list.length - 1]
}

function assert(b: boolean, message?: string) {
  if (!b) { throw new Error("Assertion failed" + (message ? `: ${message}` : "")) }
  return
}

function sliced<T>(list: T[], size: number, step: number): T[][] {
  let output = [] as T[][]
  for (let i = 0; i + size <= list.length; i += step) {
    output.push(list.slice(i, i + size))
  }
  return output
}
