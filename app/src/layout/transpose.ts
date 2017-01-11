import "../utils"
import { crossings } from "./crossings"
import { Direction, edges, flip, foreachTuple } from "./index"
import { Graph } from "graphlib"

/*
 * @see http://www.graphviz.org/Documentation/TSE93.pdf page 16
 */
export function transpose(ranks: string[][], g: Graph, direction: Direction): string[][] {
  let improved = true
  while (improved) {
    improved = false
    // walk tuples of ranks
    foreachTuple(direction, ranks, (rank, ref) => {
      // walk single rank by node tuples left-to-right
      foreachTuple("down", rank, (w, v, j, i) => {
        let es: { v: string, w: string }[] = edges(g, direction, [v, w])
        if (direction === "down") {
          es = flip(es)
        }
        if (crossings([v, w], ref, es) > crossings([w, v], ref, es)) {
          improved = true
          let tmp = rank[i]
          rank[i] = rank[j]
          rank[j] = tmp
        }
      })
    })
  }
  return ranks
}
