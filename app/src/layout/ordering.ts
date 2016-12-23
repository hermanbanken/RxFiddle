import { Graph } from "graphlib"
import { crossings, order_crossings } from "./crossings"
import { transpose } from "./transpose"
import { wmedian } from "./median"
import { Direction, Edge, edges, foreachTuple, flip } from "./index"

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
export function ordering(order: string[][], g: Graph): string[][] {

  let best: string[][]
  let best_crossings: number = Number.MAX_SAFE_INTEGER
  
  let update = (next: string[][]) => {
    let crossings = order_crossings(next, g)
    if (crossings < best_crossings) {
      best = order.map(o => o.slice(0))
      best_crossings = crossings
    }
  }
  update(order)

  for(let i = 0; i < 20; i++) {
    wmedian(order, g, i % 2 === 0 ? "up" : "down")
    transpose(order, g, "down")
    update(order)
  }

  return best
}
