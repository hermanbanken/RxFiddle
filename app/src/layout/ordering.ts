import { order_crossings } from "./crossings"
import { ExternalSort } from "./index"
import { wmedian } from "./median"
import { transpose } from "./transpose"
import { Graph } from "graphlib"

export type OrderingOptions = {
  externalSort?: ExternalSort,
  hierarchies: ((node: string) => string)[]
}

/*
 * @see http://www.graphviz.org/Documentation/TSE93.pdf page 14
 *
 * 1. init order
 * 2. for maxiterations
 * 3. wmedian
 * 4. transpose
 * 5. if (crossing < crossing)
 * 6.   best = order
 * 7. return best
 *
 */
export function ordering(order: string[][], g: Graph, options: OrderingOptions): string[][] {

  let best: string[][]
  let bestCrossings: number = Number.MAX_SAFE_INTEGER

  let bestIt = -1
  let sameCount = 0
  let lastCrossings = Number.MAX_SAFE_INTEGER

  let update = (next: string[][], i: number) => {
    try {
      // See if improved: store better results
      let crossings = order_crossings(next, g)
      if (crossings < bestCrossings) {
        best = next.map(o => o.slice(0))
        bestCrossings = crossings
        bestIt = i
      }
      // Abort if stable
      if (lastCrossings === crossings || crossings === 0) {
        sameCount++
        if (sameCount > 3 || crossings === 0) {
          return false
        }
      }
      lastCrossings = crossings
    } catch (e) {
      console.warn("Error working with", next)
      throw e
    }
    return true
  }

  if (!options.externalSort) { update(order, 0) }

  for (let i = 0; i < 40; i++) {
    wmedian(order, g, i % 2 === 0 ? "up" : "down", options)
    transpose(order, g, "down", options)
    transpose(order, g, "up", options)
    if (!update(order, i + 1)) {
      break
    }
  }

  return best
}

export function fixingSort(fixed: string[]) {
  // if a should come first: -1
  // if b should come first: 1
  return fixed.length ? (a: string, b: string) => {
    let f = fixed.indexOf(a) >= 0
    let s = fixed.indexOf(b) >= 0
    if (!f && !s || f && s) { return 0 }
    return f && !s ? -1 : 1
  } : undefined
}
