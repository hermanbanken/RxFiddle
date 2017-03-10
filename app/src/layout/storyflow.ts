import { crossings } from "./crossings"
import { Direction, ExternalSort, edges as getEdges, flip, foreachTuple } from "./index"
import { median } from "./median"
import { Graph } from "graphlib"
import * as _ from "lodash"

export type OrderingOptions = {
  externalSort?: ExternalSort,
  hierarchies: ((node: string) => string)[]
}

export function ordering(order: string[][], g: Graph, direction: Direction, options: OrderingOptions): string[][] {
  foreachTuple(direction, order, (row, prev, i) => {
    order[i] = sortRow(row, prev, g, direction, options)
  })
  return order
}

function sortRow(row: string[], prev: string[], g: Graph, direction: Direction, options: OrderingOptions): string[] {
  return sortWithHierarchies(row, prev, g, direction, ...options.hierarchies)
}

function sortWithHierarchies(
  row: string[], prev: string[],
  g: Graph,
  direction: Direction,
  ...hierarchies: ((node: string) => string)[]
): string[] {
  if (hierarchies.length === 0) {
    return minimiseCrossings(direction, row, prev, _ => _, getEdges(g, direction, row))
  }

  let hierarchy = hierarchies[0]
  let rowP = medians(hierarchy, row)
  let refP = medians(hierarchy, prev)

  let edges = getEdges(g, direction, row)
    .map(({ v, w }) => ({
      v: hierarchy(v),
      w: hierarchy(w),
    }))

  console.log("Sorting cluster", rowP.flatMap(_ => [_.id, ":", ..._.contents]), "@", row)

  let result = minimiseCrossings(direction, rowP, refP, _ => _.id, edges)

  return result.flatMap(cluster => sortWithHierarchies(cluster.contents, prev, g, direction, ...hierarchies.slice(1)))
}

function medians(hierarchy: (node: string) => string, list: string[]): { id: string, contents: string[] }[] {
  return _.chain(list)
    .map((n, index) => ({ cluster: hierarchy(n), index, n }))
    .groupBy("cluster")
    .mapValues((obj: { cluster: string, index: number, n: string }[]) => ({
      contents: obj.map(_ => _.n),
      sort: median(obj.map(_ => _.index).sort()),
    }))
    .map((v: { contents: string[], sort: number }, id: string) => ({ contents: v.contents, sort: v.sort, id }))
    .sortBy("sort")
    .value()
}

export function minimiseCrossings<T>(
  direction: Direction,
  ws: T[], vs: T[],
  sel: (e: T) => string,
  edges: { v: string, w: string }[]
): T[] {
  let improved = true

  let result = ws.map(_ => _)
  let work = result.map(sel)
  let ref = vs.map(sel)

  if (direction === "down") {
    edges = flip(edges)
  }
  // console.log()
  // console.log(work)
  // console.log(ref)
  // console.log(edges)
  edges = edges
    .filter(e => work.indexOf(e.v) >= 0)
    .filter(e => ref.indexOf(e.w) >= 0)
  // console.log(edges.length)

  while (improved) {
    improved = false
    // walk single rank by node tuples left-to-right
    foreachTuple(direction, work, (b, a, j, i) => {
      let es = edges.filter(e => e.v === a || e.v === b)
      if (crossings([a, b], ref, es) > crossings([b, a], ref, es)) {
        improved = true
        swap(work, i, j)
        swap(result, i, j)
      }
    })
  }

  return result
}

function swap<T>(list: T[], i: number, j: number) {
  let tmp = list[i]
  list[i] = list[j]
  list[j] = tmp
}
