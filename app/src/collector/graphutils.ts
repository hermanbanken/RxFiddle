import "../utils"
import { Edge as GraphEdge, Graph, alg } from "graphlib"
import * as _ from "lodash"

const TRACE = false
function trace(...args: any[]) {
  if(TRACE) console.log.apply(console, arguments)
}

function last<T>(list: T[]): T {
  return list[list.length - 1]
}

function range(start: number, exclusiveEnd: number): number[] {
  let r: number[] = []
  for(let i = start; i < exclusiveEnd; i++) {
    r.push(i)
  }
  return r
}

function clone(g: Graph, edgeFilter?: (e: GraphEdge) => boolean, transform?: (e: GraphEdge) => GraphEdge[]): Graph {
  let clone = new Graph({
    multigraph: g.isMultigraph(),
    directed: g.isDirected(),
    compound: g.isCompound(),
  })

  let edges = typeof edgeFilter === "undefined" ? 
    g.edges() : 
    g.edges().filter(edgeFilter)

  function add(e: GraphEdge) {
    clone.setEdge(e.v, e.w, g.edge(e.v, e.w))    
  }

  edges.forEach(e => {
    if(typeof transform === "undefined") {
      add(e)
    } else {
      transform(e).forEach(add)
    }
  })

  return clone
}

function firstDefined<T>(...args: T[]): T {
  if (typeof args[0] !== "undefined") {
    return args[0]
  }
  if(args.length > 1) {
    return firstDefined(...args.slice(1))
  }
  return undefined
}

function sort<T>(input: T[], byRefIndex: (elem: T) => (number | undefined)): T[] {
  return input.map((item, index) => ({ item, index, refIndex: byRefIndex(item) }))
    .sort((a, b) => {
      if(typeof a.refIndex !== "undefined" && typeof b.refIndex !== "undefined") {
        return a.refIndex - b.refIndex;
      } else {
        return firstDefined(a.refIndex, a.index) - firstDefined(b.refIndex, b.index)
      }
    }).map(v => v.item)
}

function sweep<T>(input: T[][], sort: (subject: T[], ref: T[]) => T[]): T[][] {
  trace("Sweeping")
  for (let ref = 0, i = 1; i < input.length; i++, ref++) {
    input[i] = sort(input[i], input[ref])
  }
  return input
}

/**
 * @see https://github.com/cpettitt/dagre/blob/master/lib/rank/util.js
 */
export function rankLongestPath(g: Graph) {
  let visited: { [id: string]: boolean } = {}
  let ranks: { [id: string]: number } = {}

  function dfs(v: string): number {
    if (_.has(visited, v)) {
      return ranks[v]
    }
    visited[v] = true

    let rank = _.min(_.map(g.outEdges(v), (e) => {
      return dfs(e.w) - (g.edge(e).minlen || 1)
    }))

    if (rank === Number.POSITIVE_INFINITY || typeof rank === "undefined") {
      rank = 0
    }

    return (ranks[v] = rank)
  }

  _.each(g.sources(), dfs)
  return ranks
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

export type RowRef = { column: number, obs: string }
export type Row = { column: number, sourceColumns: RowRef[], obs: string }

export function metroLayout<Label>(g: Graph, lines: Label[][]): Row[] {
  let ranks  = rankLongestPath(g)
  let sorted = Object.keys(ranks)
    .map(k => [k, ranks[k]])
    .sort((a: number[], b: number[]) => a[1] - b[1]) as [string, number][]

  let result = sorted.reduce(({ columns, index, linear }, [id, order]) => {
    let sources: Row[] = g.predecessors(id).map((v: string) => index[v])
    let row = {
      column: sources[0] && last(columns[sources[0].column]) === sources[0].obs ? sources[0].column : columns.length,
      obs: id,
      sourceColumns: sources,
    }
    linear.push(row)
    if (typeof columns[row.column] === "undefined") { columns[row.column] = [] }
    columns[row.column].push(id)
    index[id] = row
    return { columns, index, linear }
  }, {
    columns: [],
    index: {} as { [id: string]: Row },
    linear: [] as Row[],
  })

  trace(sorted, result)
  // debugger
  return result.linear
}

export type Label = string
export type LayoutItem<Label> = { 
  node: Label, 
  x: number, 
  y: number, 
  relative: Label[], 
  lines: number[],
  isDummy: boolean,
  barycenter: number,
}
export type Structure<Label> = {
  graph: Graph,
  layout: LayoutItem<Label>[]
}

const ENABLE_NORMALIZE = true
const ENABLE_BARYCENTRESORT = true
const ENABLE_PRIORITYLAYOUT = true

export function structureLayout(g: Graph, lines: Label[][]): Structure<Label> {
  let ranks  = rankLongestPath(g)
  trace("ranks\n", ranks)

  // Without long edges
  let normalized = ENABLE_NORMALIZE ? clone(g, undefined, e => {
    if(ranks[e.v] + 1 < ranks[e.w]) {
      // Add dummy nodes + edges
      let dummies = range(ranks[e.v] + 1, ranks[e.w]).map(i => ({ label: `dummy-${e.v}-${e.w}(${i})`, rank: i }))
      dummies.forEach(d => ranks[d.label] = d.rank)
      let nodes = [e.v].concat(dummies.map(d => d.label)).concat([e.w])
      return nodes.slice(1).map((w, i) => ({
        v: nodes[i],
        w
      }))
    }
    return [e]
  }) : g

  let byRank = groupByUniq(node => ranks[node], [].concat(...lines).concat(Object.keys(ranks)))
  
  let layers = Object.keys(byRank).sort((a, b) => +a - +b).map((r: string, y: number) => {
    byRank[r].map((n) => normalized.outEdges(n).map(e => {
      if(ranks[e.v] + 1 < ranks[e.w]) {
      }
    }))
    return byRank[r].map((n: Label, x: number) => ({
      node: n,
      x,
      y,
      relative: [] as Label[],
      lines: [] as number[],
      isDummy: n.startsWith("dummy"),
      barycenter: 0,
      priority: 0,
    }))
  })

  // Sweeping the layers
  if(ENABLE_BARYCENTRESORT) {
    for (let iteration = 0; iteration < 10; iteration++) {
      let direction: "up" | "down" = iteration % 2 === 0 ? "down" : "up"
      sweep(layers, (subject, ref) => {
        return sort(subject, (item) => {
          return barycenter(
            normalized, 
            direction, 
            item.node, 
            linked => ref.findIndex(r => r.node === linked)
          )
        })
      })
      layers.reverse()
    }

    layers.forEach(layer => 
      layer.forEach(
        (item, index) => item.x = index
      )
    )
  }

  if(ENABLE_PRIORITYLAYOUT) {
    for (let iteration = 0; iteration < 2; iteration++) {
      let dir: "up" | "down" = iteration % 2 === 0 ? "down" : "up"
      for(let i = dir === "down" ? 1 : layers.length - 2; dir === "down" ? i < layers.length : i >= 0; dir === "down" ? i++ : i--) {
        let j = dir === "down" ? i - 1 : i + 1
        layers[i].forEach(item => {
          item.priority = item.isDummy ? Number.MAX_SAFE_INTEGER : priority(normalized, dir, item.node)
          item.barycenter = barycenter(normalized, dir, item.node, linked => head(layers[j].filter(r => r.node === linked).map(r => r.x)))
        })
        priorityLayoutReorder(layers[i])
      }
    }
    shiftOffset(layers)
  }

  let layout = layers.flatMap(v => v)

  return {
    layout,
    graph: normalized,
  }
}

function barycenter(g: Graph, direction: "up" | "down", node: string, ref: (node: string) => number): number {
  let linkedNodes = direction === "down" ? 
    g.inEdges(node).map(e => e.v) : 
    g.outEdges(node).map(e => e.w);
  // Find Barycenter
  let positions = linkedNodes.map(ref).filter(v => typeof v === "number")
  return avg(positions)
}

function priority(g: Graph, direction: "up" | "down", node: string): number {
  let linkedNodes = direction === "down" ? 
    g.inEdges(node).map(e => e.v) : 
    g.outEdges(node).map(e => e.w);
  return linkedNodes.length
}

export function priorityLayoutReorder<Label>(items: (LayoutItem<Label> & {priority: number})[]): void {
  let move = (priority: number, index: number, requestedShift: number): number => {
    let subject = items[index]
    if(subject.priority > priority) return 0
    if(items.length === index + 1 && requestedShift > 0) {
      trace("Testing", subject.node, "last node, shifting", requestedShift)
      subject.x += requestedShift
      return requestedShift      
    }
    if(index === 0 && requestedShift < 0) {
      trace("Testing", subject.node, "first node, shifting", requestedShift)
      subject.x += requestedShift
      return requestedShift
    }
    let next = index + Math.sign(requestedShift)
    let slack = absMin(requestedShift, items[next].x - subject.x - Math.sign(requestedShift))
    if(Math.abs(slack) < Math.abs(requestedShift)) {
      let nextMoved = move(priority, next, requestedShift - slack)
      trace("Testing", subject.node, "bubbled shift, had", slack, "got additional", nextMoved)
      subject.x += slack + nextMoved
      return slack + nextMoved
    } else {
      trace("Testing", subject.node, "inside slack shift of ", slack, ", had", items[next].x - subject.x - Math.sign(requestedShift), "slack")
      subject.x += slack
      return slack
    }
  }

  items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => b.item.priority - a.item.priority)
    .forEach(({ item, index }) => {
      trace("Moving", item.node)
      if (typeof item.barycenter !== "undefined") {
        move(item.priority, index, Math.round(item.barycenter) - item.x)        
      }
    })
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

export function slack(g: Graph, e: GraphEdge): number {
  return g.node(e.w).rank - g.node(e.v).rank - g.edge(e).minlen
}

export function indexedBy<T>(selector: (item: T) => string, list: T[]): { [key: string]: T } {
  let obj = {} as { [key: string]: T }
  list.forEach((i: T) => { obj[selector(i)] = i })
  return obj
}

export function groupBy<T>(selector: (item: T) => string, list: T[]): { [key: string]: T[] } {
  let obj = {} as { [key: string]: T[] }
  list.forEach((i: T) => {
    let k  = selector(i)
    obj[k] = obj[k] || []
    obj[k].push(i)
  })
  return obj
}

export function groupByUniq<T, K extends (string | number)>(selector: (item: T) => K, list: T[]): { [key: string]: T[] } {
  let obj = {} as { [key: string]: T[] }
  list.forEach((i: T) => {
    let k  = selector(i) as string
    obj[k] = obj[k] || []
    if(obj[k].indexOf(i) === -1) {
      obj[k].push(i)
    }
  })
  return obj
}

function avg(list: number[]): number {
  if(list.length === 0) return undefined
  if(list.length === 1) return list[0]
  return list.reduce((sum, v) => sum + (v / list.length), 0)
}

function takeWhile<T>(list: T[], pred: (item: T) => boolean) {
  let ret: T[] = []
  for(let i = 0; i < list.length && pred(list[i]); i++) {
    ret.push(list[i])
  }
  return ret
}

function head<T>(list: T[]): T {
  if(list.length > 0) {
    return list[0]
  }
  return undefined
}

function absMin(a: number, b: number): number {
  return Math.abs(a) < Math.abs(b) ? a : b
}