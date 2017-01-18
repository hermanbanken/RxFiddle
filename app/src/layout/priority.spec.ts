import { priorityLayout } from "./priority"
import { assert, expect, use as chaiUse } from "chai"
import { Graph } from "graphlib"
import { suite, test } from "mocha-typescript"

function asGraph(es: { v: string, w: string }[]): Graph {
  let g = new Graph()
  es.forEach(({ v, w }) => g.setEdge(v, w))
  return g
}

@suite
export default class PriorityLayoutSpec {

  @test
  public "test simple"() {
    ///  c     d
    ///  | \ / |
    ///  | / \ |
    ///  a     b

    let ranks = [["c", "d"], ["a", "b"]]
    let g = asGraph([
      { v: "a", w: "c" },
      { v: "a", w: "d" },
      { v: "b", w: "c" },
      { v: "b", w: "d" },
    ])

    let res = priorityLayout(ranks, g)
    expect(res).to.deep.eq([
      { id: "c", x: 0, y: 0 },
      { id: "d", x: 1, y: 0 },
      { id: "a", x: 0, y: 1 },
      { id: "b", x: 1, y: 1 },
    ])
  }

}
