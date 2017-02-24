// import networkSimplex from "../layout/dagre/networksimplex"
import "../utils"
import TypedGraph from "./typedgraph"
import { Edge as GraphEdge, Graph, alg, json } from "graphlib"
import * as _ from "lodash"

const networkSimplex = require("dagre/lib/rank/network-simplex")

const TRACE = false
function trace(...args: any[]) {
  if (TRACE) { console.log.apply(console, arguments) }
}

export function last<T>(list: T[]): T {
  return list[list.length - 1]
}

export function head<T>(list: T[]): T {
  return list[0]
}

export function takeWhile<T>(list: T[], pred: (item: T) => boolean) {
  let ret: T[] = []
  for (let i = 0; i < list.length && pred(list[i]); i++) {
    ret.push(list[i])
  }
  return ret
}

export function range(start: number, exclusiveEnd: number): number[] {
  let r: number[] = []
  for (let i = start; i < exclusiveEnd; i++) {
    r.push(i)
  }
  return r
}

function avg(list: number[]): number {
  if (list.length === 0) { return undefined }
  if (list.length === 1) { return list[0] }
  return list.reduce((sum, v) => sum + (v / list.length), 0)
}

function absMin(a: number, b: number): number {
  return Math.abs(a) < Math.abs(b) ? a : b
}

function firstDefined<T>(...args: T[]): T {
  if (typeof args[0] !== "undefined") {
    return args[0]
  }
  if (args.length > 1) {
    return firstDefined(...args.slice(1))
  }
  return undefined
}

function sort<T>(input: T[], byRefIndex: (elem: T) => (number | number[] | undefined)): T[] {
  return input.map((item, index) => ({ item, index, refIndex: byRefIndex(item) }))
    .sort((a, b) => {
      if (Array.isArray(a.refIndex) && Array.isArray(b.refIndex)) {
        for (let i = 0; i < a.refIndex.length; i++) {
          if (a.refIndex[i] !== b.refIndex[i]) {
            return a.refIndex[0] - b.refIndex[0]
          }
        }
      }
      if (typeof a.refIndex === "number" && typeof b.refIndex === "number") {
        return a.refIndex - b.refIndex
      } else {
        return 0
        // firstDefined(a.refIndex, a.index) - firstDefined(b.refIndex, b.index)
      }
    }).map(v => v.item)
}

export type Direction = "down" | "up"
export function sweep<T>(input: T[][], direction: Direction, sort: (subject: T[], ref: T[]) => T[]): T[][] {
  trace("Sweeping", direction)
  if (direction === "down") {
    for (let i = 1, ref = i - 1; i < input.length; i++ , ref++) {
      input[i] = sort(input[i], input[ref])
    }
  } else {
    for (let i = input.length - 2, ref = i + 1; i >= 0; i-- , ref--) {
      input[i] = sort(input[i], input[ref])
    }
  }
  return input
}

/**
 * @see https://github.com/cpettitt/dagre/blob/master/lib/rank/util.js
 */
export function rankLongestPath(g: Graph): { [id: string]: number } {
  let visited: { [id: string]: boolean } = {}
  let ranks: { [id: string]: number } = {}

  function dfs(v: string): number {
    if (_.has(visited, v)) {
      return ranks[v]
    }
    visited[v] = true

    let rank = _.min(_.map(g.outEdges(v), (e) => {
      return dfs(e.w) - (g.edge(e) && g.edge(e).minlen || 1)
    }))

    if (rank === Number.POSITIVE_INFINITY || typeof rank === "undefined") {
      rank = 0
    }

    return (ranks[v] = rank)
  }

  _.each(g.sources(), dfs)
  return ranks
}

export function rankFromTop(g: Graph): { [id: string]: number } {
  let sanitized = new Graph()
  g.edges().filter(e => e.v !== e.w).forEach(e => sanitized.setEdge(e.v, e.w))
  g.nodes().forEach(n => sanitized.setNode(n))

  let visited: { [id: string]: boolean } = {}
  let ranks: { [id: string]: number } = {}

  function dfs(v: string): number {
    if (_.has(visited, v)) {
      return ranks[v]
    }
    visited[v] = true

    let rank = _.max(_.map(sanitized.inEdges(v), (e) => {
      return dfs(e.v) + (g.edge(e) && g.edge(e).minlen || 1)
    }))

    if (rank === Number.NEGATIVE_INFINITY || typeof rank === "undefined") {
      rank = 0
    }

    return (ranks[v] = rank)
  }

  _.each(sanitized.sinks(), dfs)

  return ranks
}

export function rankLongestPathGraph<V, E>(g: TypedGraph<V, E>): TypedGraph<V & Ranked, E> {
  let ranked = (g as any) as TypedGraph<V & Ranked, E>
  let ranks = rankLongestPath(g)
  ranked.nodes().map(n => {
    ranked.node(n).rank = ranks[n]
  })
  return ranked
}

export function rankFromTopGraph<V, E>(g: TypedGraph<V, E>): TypedGraph<V & Ranked, E> {
  let ranked = (g as any) as TypedGraph<V & Ranked, E>
  let ranks = rankFromTop(g)
  let allSet = true
  ranked.nodes().map(n => {
    let node = ranked.node(n)
    if (typeof node === "object") { node.rank = ranks[n] }
    if (typeof ranks[n] === "undefined") {
      allSet = false
      console.error("No rank for " + n, ranks)
    }
  })
  return ranked
}

export function removeSlack<V extends Ranked, E>(g: TypedGraph<V, E>): TypedGraph<V & Ranked, E> {
  g.nodes().forEach(v => {
    let copy = Object.assign({}, g.node(v) || {} as any)
    delete copy.ranked
    g.setNode(v, Object.assign({}, g.node(v) || {} as any))
  })
  g.edges().forEach(e => g.setEdge(e.v, e.w, Object.assign({}, g.edge(e), { minlen: 1, weight: 1 })))

  // TODO remove debug assignment
  if (typeof window === "object") {
    (window as any).gjson = json
  }
  // let rank = (v: string) => g.node(v).rank
  // let f = g.flatMap<V, E>((id, label) => [{ id, label }], (e, label: E) => {
  //   // Reverse
  //   if (rank(e.v) > rank(e.w)) {
  //     // TODO make sure original is reversed again
  //     // e = { v: e.w, w: e.v }
  //   }
  //   return [{ id: e, label }]
  // })

  alg.components(g).map(c => g.filterNodes(n => c.indexOf(n) >= 0)).forEach(component => {
    if (!alg.isAcyclic(component)) {
      console.warn("Running networkSimplex on cyclic graph")
    }
    try {
      networkSimplex(component)
    } catch (e) {
      console.warn("Fallback to rankFromTopGraph", e)
      // rankFromTopGraph(component)
    }
    // Make all ranks be in range [0,1,2...)
    let min = component.nodes().reduce((prev, c) => Math.min(prev, component.node(c).rank), Infinity)
    component.nodes().forEach(n => component.node(n).rank -= min)
  })
  return g
}

function leftPad(l: number, a: any): string {
  let r = `${a}`
  while (r.length < l) {
    r = " " + r
  }
  return r
}
function rightPad(l: number, a: any): string {
  let r = `${a}`
  while (r.length < l) {
    r += " "
  }
  return r
}

export type Label = string
export type LayoutItem<Label> = {
  node: Label,
  x: number,
  y: number,
  fixedX?: number,
  isDummy: boolean,
  barycenter: number,
  hierarchicOrder: number[],
}

const ENABLE_NORMALIZE = true
const ENABLE_BARYCENTRESORT = true
const ENABLE_PRIORITYLAYOUT = true

export type LayouterInput = {
  graph: Graph
}
export type LayouterOutput<Label> = {
  graph: Graph,
  edges: { v: string, w: string, points: { x: number, y: number }[] }[],
  layout: LayoutItem<Label>[]
}

export type Hierarchy = { hierarchicOrder: number[] }
export type Fixable = { fixedX?: number }
export type Ranked = { rank: number }
export type InGraph<V extends Hierarchy & Fixable, E> = TypedGraph<V, E>

// TODO make it online
export function structureLayout<V extends Hierarchy & Fixable & Ranked, E>(g: InGraph<V, E>): LayouterOutput<Label> {
  let ranks = {} as { [id: string]: number }
  g.nodes().map(n => {
    ranks[n] = g.node(n).rank
  })
  trace("ranks\n", ranks)

  // Without long edges
  let normalized: Graph
  if (ENABLE_NORMALIZE) {
    normalized = g.flatMap((id, label) => [{ id, label }], (e) => {
      if (ranks[e.v] + 1 < ranks[e.w]) {
        // Add dummy nodes + edges
        let dummies = range(ranks[e.v] + 1, ranks[e.w]).map(i => ({ label: `dummy-${e.v}-${e.w}(${i})`, rank: i }))
        dummies.forEach(d => ranks[d.label] = d.rank)
        let nodes = [e.v].concat(dummies.map(d => d.label)).concat([e.w])
        return nodes.slice(1).map((w, i) => ({
          id: { v: nodes[i], w },
          label: undefined,
        }))
      } else {
        return [{ id: e, label: undefined }]
      }
    })
  } else {
    normalized = g
  }

  let byRank = groupByUniq(node => ranks[node], Object.keys(ranks))

  // Convert rank's vertices to layered layout items
  let layers = Object.keys(byRank).sort((a, b) => +a - +b).map((r: string, y: number) => {
    return byRank[r].map((n: Label, x: number) => ({
      x,
      y,
      barycenter: 0,
      fixedX: g.node(n) && g.node(n).fixedX || 0,
      hierarchicOrder: g.node(n) && g.node(n).hierarchicOrder || [],
      isDummy: n.startsWith("dummy"),
      node: n,
      priority: 0,
      spacing: 1,
    }))
  })

  // Sort vertices according to BaryCenter's
  if (ENABLE_BARYCENTRESORT) {
    for (let iteration = 0; iteration < 10; iteration++) {
      let direction: Direction = iteration % 2 === 0 ? "down" : "up"
      sweep(layers, direction, (subject, ref) => {

        // Get node bary-center
        subject.forEach(item => {
          item.barycenter = barycenter(
            normalized,
            direction,
            item.node,
            linked => ref.findIndex(r => r.node === linked)
          )
        })
        // Retrieve hierarchies
        let groups = groupBy(n => 1/* n.hierarchicOrder[1]*/, subject)
        let perLocation = Object.keys(groups).map(k => groups[k])
        // Two sorting criteria: Location BC + Node BC
        let sortable = perLocation.flatMap(v => {
          let loc = head(v.map(i => i.hierarchicOrder[1]))
          // if(typeof loc === "undefined") {
          return v.map(i => ({ item: i, sort: [i.barycenter, i.barycenter] }))
          // } else {
          //   let loc_bc = avg(v.map(i => i.barycenter))
          //   return v.map(i => ({ item: i, sort: [loc_bc, i.barycenter] }))
          // }
        })

        return sort(sortable, i => i.sort).map(i => i.item)
      })
      layers.reverse()
    }
  }

  // Bundle same hierarchies
  layers.forEach(layer => {
    let x = 0
    layer.forEach((item, index, list) => {
      if (index === list.length - 1) {
        item.spacing = 1
      } else if (
        typeof item.hierarchicOrder[1] !== "undefined" &&
        item.hierarchicOrder[1] === list[index + 1].hierarchicOrder[1]
      ) {
        item.spacing = 0.4
      } else {
        item.spacing = 1
      }
      item.x = x
      x += item.spacing
    })
  })

  // // Assign x positions after ordering; keep fixed positions
  // layers.forEach(layer => {
  //   let fixed = layer.filter(l => l.fixedX).sort((a, b) => a.fixedX - b.fixedX)
  //   let nonfixed = layer.filter(l => typeof l.fixedX === "undefined")
  //   for(let i = 0, j = 0; i < layer.length; i++, j++) {
  //     if(fixed.length && fixed[0].fixedX <= i) {
  //       fixed[0].x = i
  //       fixed.shift()
  //       j--;
  //     } else {
  //       nonfixed[j].x = i
  //     }
  //   }
  // })

  // Balancing or centering relative to branches
  if (ENABLE_PRIORITYLAYOUT) {
    for (let iteration = 0; iteration < 10; iteration++) {
      let direction: Direction = iteration % 2 === 0 ? "down" : "up"
      sweep(layers, direction, (subject, ref) => {
        subject.forEach(item => {
          item.priority = item.isDummy ? Number.MAX_SAFE_INTEGER : priority(
            normalized,
            direction,
            item.node
          )
          item.barycenter = barycenter(
            normalized,
            direction,
            item.node,
            linked => head(ref.filter(r => r.node === linked).map(r => r.x))
          )
        })
        priorityLayoutAlign(subject)
        return subject
      })
    }
    shiftOffset(layers)
  }

  let layout = layers.flatMap(v => v)

  // Convert dummy paths back to full paths
  let index = indexedBy(i => i.node, layout)
  let edges = g.edges().map(({v, w}) => {
    let mids: { x: number, y: number }[]
    if (ranks[v] + 1 < ranks[w]) {
      mids = range(ranks[v] + 1, ranks[w]).map(i => `dummy-${v}-${w}(${i})`)
        .map(k => index[k])
        .map(({x, y}) => ({ x, y }))
    } else {
      mids = []
    }
    return {
      v, w,
      points: [
        { x: index[v].x, y: index[v].y },
        ...mids,
        { x: index[w].x, y: index[w].y },
      ],
    }
  })

  return {
    graph: normalized,
    layout: layout.filter(v => !v.isDummy),
    edges,
  }
}

function linkedNodes(g: Graph, direction: Direction, node: string): string[] {
  if (!g.hasNode(node)) {
    console.warn("looking for non-graph node", node)
    return []
  }
  return direction === "down" ?
    g.inEdges(node).map(e => e.v) :
    g.outEdges(node).map(e => e.w)
}

function barycenter(g: Graph, direction: "up" | "down", node: string, ref: (node: string) => number): number {
  let nodes = linkedNodes(g, direction, node)
  // Find Barycenter
  let positions = nodes.map(ref).filter(v => typeof v === "number")
  return avg(positions)
}

function priority(g: Graph, direction: "up" | "down", node: string): number {
  let nodes = linkedNodes(g, direction, node)
  return nodes.length
}

// Greedy hierarchic sort, according to StoryFlow section 5.2
// function hierarcySort<Label>(frame: LayoutItem<Label>[], ref: LayoutItem<Label>[]): void {
//   if(frame.length === 0) { return }
//   let dim = frame[0].hierarchicOrder.length

//   for(let level = 0; level < dim; level++) {
//     let index = groupBy(n => n.hierarchicOrder[level]+"", frame)
//     let maxSize = Object.keys(index).map(k => index[k]).reduce((p, l) => Math.max(p, l.length), 0)
//     let maxSized = Object.keys(index).map(k => index[k]).find(g => g.length === maxSize)
//     if(typeof maxSized !== "object") continue

//     let order = [maxSized[0].hierarchicOrder[level]]
//   }

//   groupBy(n => n.hierarchicOrder[0], frame)
// }

export type PriorityLayoutItem = {
  x: number,
  readonly priority: number,
  readonly barycenter: number,
  readonly spacing?: number,
}
export function priorityLayoutAlign<Label>(items: PriorityLayoutItem[]): void {
  let move = (priority: number, index: number, requestedShift: number): number => {
    let subject = items[index]
    if (subject.priority > priority || requestedShift === 0) { return 0 }
    if (items.length === index + 1 && requestedShift > 0) {
      subject.x += requestedShift
      return requestedShift
    }
    if (index === 0 && requestedShift < 0) {
      subject.x += requestedShift
      return requestedShift
    }
    let spacing = items[index + Math.min(0, Math.sign(requestedShift))].spacing || 1
    let next = index + Math.sign(requestedShift)
    let slack = absMin(requestedShift, items[next].x - subject.x - Math.sign(requestedShift) * spacing)
    // Bubble move
    let nextMoved = move(priority, next, requestedShift - slack)
    subject.x += slack + nextMoved
    return slack + nextMoved
  }

  // let backup = items.map(i => i.x)
  // let beforeDistance = items.map(i => i.barycenter - i.x).reduce((sum, n) => sum + n, 0)

  items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => b.item.priority - a.item.priority)
    .forEach(({ item, index }) => {
      if (typeof item.barycenter !== "undefined") {
        move(item.priority, index, item.barycenter - item.x)
      }
    })

  // let afterDistance = items.map(i => i.barycenter - i.x).reduce((sum, n) => sum + n, 0)
  // if(afterDistance > beforeDistance) {
  //   backup.forEach((x, index) => items[index].x = x)
  // }
}

function shiftOffset<T extends { x: number }>(layers: T[][]) {
  let max = Number.MAX_SAFE_INTEGER
  let offset = layers.reduce((l, layer) => Math.min(l, layer.reduce((p, item) => Math.min(p, item.x), max)), max)
  layers.forEach(layer => layer.forEach(item => {
    item.x -= offset
  }))
}

export function lines(g: Graph): string[][] {
  let ranks = rankLongestPath(g)
  let grouped = _.mapValues(_.groupBy(_.toPairs(ranks), l => l[1]), v => v.map(n => n[0]))
  let groups = _.toPairs(grouped)
  let levels = groups
    .sort((a, b) => a[0] - b[0])
  trace(levels.map(l => `${leftPad(5, l[0])}${l[1].map(leftPad.bind(null, 5)).join("")}`).join("\n"))

  let visited: { [id: string]: boolean } = {}
  let positions: { [id: string]: number } = {}
  function dfs(v: string, index: number = 0): number {
    if (_.has(visited, v)) {
      return positions[v]
    }
    visited[v] = true

    let rank = _.max(_.map(g.outEdges(v), (e, i) => { return dfs(e.w, i + index) }))

    if (rank === Number.POSITIVE_INFINITY || typeof rank === "undefined") {
      rank = index
    }

    return (positions[v] = rank)
  }

  _.each(g.sources(), dfs)
  trace(positions)

  let ls = levels.map(l => {
    let row = l[1].reduce((text: string, n: string) => {
      let p = positions[n]
      text = rightPad(p * 4 + 4, text)
      return text.substr(0, p * 4) + leftPad(4, n) + text.substr((p + 1) * 4, text.length)
    }, "")
    return `${leftPad(5, l[0])}${row}`
  }).join("\n")
  trace(ls)

  return []
}

export function indexedBy<T>(selector: (item: T) => string, list: T[]): { [key: string]: T } {
  let obj = {} as { [key: string]: T }
  list.forEach((i: T) => { obj[selector(i)] = i })
  return obj
}

export function groupBy<T>(selector: (item: T) => string | number, list: T[]): { [key: string]: T[] } {
  let obj = {} as { [key: string]: T[] }
  list.forEach((i: T) => {
    let k = selector(i)
    obj[k] = obj[k] || []
    obj[k].push(i)
  })
  return obj
}

export function groupByUniq<T, K extends (string | number)>(
  selector: (item: T) => K, list: T[]
): { [key: string]: T[] } {
  let obj = {} as { [key: string]: T[] }
  list.forEach((i: T) => {
    let k = selector(i) as string
    obj[k] = obj[k] || []
    if (obj[k].indexOf(i) === -1) {
      obj[k].push(i)
    }
  })
  return obj
}

export function mapFilter<T, V>(list: T[], f: (item: T, index: number, list: T[]) => (V | undefined)) {
  return list.map(f).filter(v => typeof v !== "undefined")
}

export function toDot<T>(graph: Graph, props?: (n: T) => any, edgeProps?: (e: GraphEdge) => any): string {
  return "graph g {\n" +
    "node [style=filled];\n" +
    graph.nodes().map((n: any) => {
      if (props) {
        let data = props(n)
        let query = Object.keys(data).map(k => `${k}="${data[k]}"`).join(", ")
        return `"${n}" [${query}];`
      }
      return `"${n}";`
    }).join("\n") +
    graph.edges().map((e: GraphEdge) => {
      if (edgeProps) {
        let data = edgeProps(e)
        let query = Object.keys(data).map(k => `${k}="${data[k]}"`).join(", ")
        return `${e.v} -- ${e.w} [${query}];`
      }
      return e.v + " -- " + e.w + " [type=s];"
    }).join("\n") +
    "\n}"
}
