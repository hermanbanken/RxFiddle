import "../utils"
import { Edge as GraphEdge, Graph } from "graphlib"
import * as _ from "lodash"

function last<T>(list: T[]): T {
  return list[list.length - 1]
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

  console.log(sorted, result)
  // debugger
  return result.linear
}

export type Label = string
export type LayoutItem<Label> = { node: Label, x: number, y: number, relative: Label[], lines: number[] }
export function structureLayout(g: Graph, lines: Label[][]): LayoutItem<Label>[] {
  let ranks  = rankLongestPath(g)
  console.log("ranks\n", ranks)
  let byRank = [].concat(...lines).concat(Object.keys(ranks)).reduce((index, node) => {
    if(typeof index[ranks[node]] === "undefined") {
      index[ranks[node]] = []
    }
    if(index[ranks[node]].indexOf(node) === -1) {
      index[ranks[node]].push(node)    
    }
    return index
  }, {} as { [node: string]: string[] })

  function dfs(node: string, store: { [label: string]: LayoutItem<Label> }, offset: number = 0): LayoutItem<Label> {
    if(typeof store[node] !== "undefined") {
      return store[node]
    }

    let parents = g.predecessors(node)
    let parentLayout = parents.map(p => dfs(p, store, byRank[ranks[node]].indexOf(node)))
    if(parentLayout.length == 0) {
      return {
        node,
        lines: [],
        x: byRank[ranks[node]].indexOf(node),
        y: 0,
        relative: []
      }
    }

    return {
      node,
      lines: [],
      x: Math.max(byRank[ranks[node]].indexOf(node), Math.min(...parentLayout.map(l => l.y))),
      y: Math.max(...parentLayout.map(l => l.y))+1,
      relative: parents,
    }
  }

  let result = [].concat(...lines).concat(g.nodes()).reduce((memo: { [label: string]: LayoutItem<Label> }, node: string) => {
    console.log("Walking", node)
    if(typeof memo[node] !== "undefined") {
      return memo
    }
    memo[node] = dfs(node, memo)
    return memo
  }, {} as { [label: string]: LayoutItem<Label> })

  lines.forEach((line, index)  => {
    line.forEach(n => result[n].lines.push(index))
  })

  return Object.keys(result).map(k => result[k])
}

export function lines(g: Graph): string[][] {
  let ranks = rankLongestPath(g)
  let grouped = _.mapValues(_.groupBy(_.toPairs(ranks), l => l[1]), v => v.map(n => n[0]))
  let groups = _.toPairs(grouped)
  let levels = groups
    .sort((a, b) => a[0] - b[0])
  console.log(levels.map(l => `${leftPad(5, l[0])}${l[1].map(leftPad.bind(null, 5)).join("")}`).join("\n"))

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
  console.log(positions)

  let ls = levels.map(l => {
    let row = l[1].reduce((text: string, n: string) => {
      let p = positions[n]
      text = rightPad(p * 4 + 4, text)
      return text.substr(0, p * 4) + leftPad(4, n) + text.substr((p + 1) * 4, text.length)
    }, "")
    return `${leftPad(5, l[0])}${row}`
  }).join("\n")
  console.log(ls)

  return []
}

export function slack(g: Graph, e: GraphEdge): number {
  return g.node(e.w).rank - g.node(e.v).rank - g.edge(e).minlen
}
