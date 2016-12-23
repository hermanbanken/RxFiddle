import { Edge, edges, flip, foreachTuple } from "./index"
import { Graph } from "graphlib"

export function crossings(vRow: string[], wRow: string[], edges: Edge[]) {
  let map = edges.map(e => {
    let m = { 
      v: vRow.indexOf(e.v), 
      w: wRow.indexOf(e.w)
    }
    if(m.v < 0 || m.w < 0) throw new Error(`Invalid edge <${e.v},${e.w}>`)
    return m
  }).sort((a, b) => a.v - b.v)
  
  // Short-circuit if 0-crossings
  let max: number
  max = map.reduce((p, n) => n.w > p ? n.w : Number.MAX_SAFE_INTEGER, -1)
  if(max !== Number.MAX_SAFE_INTEGER) {
    return 0
  }

  let crossings = 0
  for (let i = 0; i < map.length; i++) {
    for (let j = 0; j < i; j++) {
      if(map[i].w < map[j].w) crossings++
    }
  }
  return crossings
}

export function order_crossings(order: string[][], g: Graph): number {
  let count = 0
  foreachTuple("down", order, (row, ref) => {
    let es: { v: string, w: string }[] = flip(edges(g, "down", row))
    count += crossings(row, ref, es)
  })
  return count
}
