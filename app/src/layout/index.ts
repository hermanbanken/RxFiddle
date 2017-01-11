import "../utils"
import { Graph } from "graphlib"

export type Direction = "up" | "down"
export type Edge = { v: string, w: string }

export function neg(d: Direction): Direction { return d === "up" ? "down" : "up" }

export function foreachTuple<T>(direction: Direction, list: T[], f: (a: T, b: T, anr: number, bnr: number) => void) {
  if (direction === "down") {
    for (let i = 1, ref = i - 1; i < list.length; i++ , ref++) {
      f(list[i], list[ref], i, ref)
    }
  } else {
    for (let i = list.length - 2, ref = i + 1; i >= 0; i-- , ref--) {
      f(list[i], list[ref], i, ref)
    }
  }
}

export function flip(es: Edge[]): Edge[] {
  return es.map(({ v, w}) => ({ v: w, w: v }))
}

export function edges(g: Graph, direction: Direction, nodes: string[]): Edge[] {
  return nodes.flatMap(node => {
    if (!g.hasNode(node)) {
      console.warn("looking for non-graph node", node)
      return []
    }
    return direction === "down" ?
      g.inEdges(node) :
      g.outEdges(node)
  })
}
