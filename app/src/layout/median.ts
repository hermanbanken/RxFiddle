import { Graph } from "graphlib"
import { Direction, edges, foreachTuple } from "./index"

export function wmedian(ranks: string[][], g: Graph, dir: Direction): void {
  foreachTuple(dir, ranks, (row, ref, rowIndex) => {
    let indices = edges(g, dir, row).reduce((store, e) => {
      let index = ref.indexOf(dir === "down" ? e.v : e.w)
      if(index >= 0) {
        let n = dir === "down" ? e.w : e.v
        store[n] = store[n] || []
        store[n].push(index)
      }
      return store
    }, <{ [node: string]: number[] }>{})

    let sortable = Object.keys(indices).map((n: string) => ({ n, median: median(indices[n]) }))
    ranks[rowIndex] = sortable.sort((a, b) => {
      if(a.median < 0 || b.median < 0) return 0
      return a.median - b.median
    }).map(i => i.n)
  })
}

export function median(list: number[]): number {
  let m = Math.floor(list.length / 2)
  if(list.length === 0) {
    return -1
  } else if(list.length % 2 === 1) {
    return list[m]
  } else if(list.length === 2) {
    return (list[0] + list[1]) / 2
  } else {
    let left = list[m-1] - list[0]
    let right = list[list.length - 1] - list[m]
    return list[m-1]*right + list[m]*left / (left + right)
  }
}
