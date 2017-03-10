import { Edge, edges, flip, foreachTuple } from "./index"
import { OrderingOptions } from "./ordering"
import { Graph } from "graphlib"

function sorting(a: { v: number, w: number }, b: { v: number, w: number }) {
  // Sort on v, 
  if (a.v !== b.v) {
    return a.v - b.v
  }
  // or - only if equal v - we can swap w's as lines from same origin never cross
  return a.w - b.w
}

export function crossings(vRow: string[], wRow: string[], edges: Edge[]) {
  let map = edges.map(e => {
    let m = {
      v: vRow.indexOf(e.v),
      w: wRow.indexOf(e.w),
    }
    if (m.v < 0 || m.w < 0) {
      throw new Error(`Invalid edge <${e.v},${e.w}>; looking in 
      vRow: ${vRow},\nwRow: ${wRow}, 
      edges: ${edges.map(v => `${e.v}-${e.w}`).join(",")}`)
    }
    return m
  }).sort(sorting)

  // Short-circuit if 0-crossings
  let max: number
  max = map.reduce((p, n) => n.w > p ? n.w : Number.MAX_SAFE_INTEGER, -1)
  if (max !== Number.MAX_SAFE_INTEGER) {
    return 0
  }

  let crossings = 0
  for (let i = 0; i < map.length; i++) {
    for (let j = 0; j < i; j++) {
      if (map[i].w < map[j].w) { crossings++ }
    }
  }
  return crossings
}

const weights = {
  crossings: 1,
  switches: 4,
}

export function order_penalty(order: string[][], g: Graph, options?: OrderingOptions): number {
  let penalty = 0
  order.forEach(row => {
    penalty += weights.switches * (options && options.hierarchies || [])
      .map(h => countSwitches(h, row)).reduce((p, n) => p + n, 0)
  })
  foreachTuple("down", order, (row, ref) => {
    let es: { v: string, w: string }[] = flip(edges(g, "down", row))
    try {
      penalty += crossings(row, ref, es) * weights.crossings
    } catch (e) {
      console.log("Error in down sweep of ordering:\n" + order.map(r => {
        let prefix = row === r && "row -> " || ref === r && "ref -> " || "       "
        return prefix + r.join(", ")
      }).join("\n") + "\nEdges: " + es.map(e => e.v + "->" + e.w).join("; ") + "\n", g)
      throw e
    }
  })
  return penalty
}

function countSwitches(hierarchy: (id: string) => string, row: string[]): number {
  return row.map(hierarchy).reduce((p, n, i, list) => i === 0 ? p : p + (list[i - 1] === n ? 0 : 1), 0)
}
