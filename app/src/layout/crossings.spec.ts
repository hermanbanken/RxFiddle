import { crossings, order_crossings } from "./crossings"
import { expect } from "chai"
import { Graph } from "graphlib"
import { suite, test } from "mocha-typescript"

function asGraph(es: { v: string, w: string }[]): Graph {
  let g = new Graph()
  es.forEach(({ v, w }) => g.setEdge(v, w))
  return g
}

function both(row: string[], ref: string[], edges: { v: string, w: string }[]): number {
  let c = crossings(row, ref, edges)
  expect(order_crossings([row, ref], asGraph(edges))).to.eq(c)
  return c
}

@suite
export default class CrossingSpec {

  @test
  public "test straight"() {
    ///   -----c-----d----
    ///        |     |
    ///        |     |
    ///   -----a-----b----

    let c = both(["a", "b"], ["c", "d"], [
      { v: "a", w: "c" },
      { v: "b", w: "d" },
    ])
    expect(c).to.eq(0)
  }

  @test
  public "test simple"() {
    ///   -----c-----d----
    ///        | \ / |
    ///        | / \ |
    ///   -----a-----b----

    let c = both(["a", "b"], ["c", "d"], [
      { v: "a", w: "c" },
      { v: "a", w: "d" },
      { v: "b", w: "c" },
      { v: "b", w: "d" },
    ])
    expect(c).to.eq(1)
  }

  @test
  public "test 6"() {
    ///   -----d-e-f-g-h--
    ///           / / /
    ///          ////
    ///         //   d e
    ///        /     | |
    ///   -----a-----b-c--

    let c = both(["a", "b", "c"], ["d", "e", "f", "g", "h"], [
      { v: "a", w: "f" },
      { v: "a", w: "g" },
      { v: "a", w: "h" },
      { v: "b", w: "d" },
      { v: "c", w: "e" },
    ])
    expect(c).to.eq(6)
  }

  @test
  public "test 7"() {
    ///   -----d-e-f-g-h--
    ///           / / /
    ///          ////
    ///         //   e d
    ///        /     | |
    ///   -----a-----b-c--

    let c = both(["a", "b", "c"], ["d", "e", "f", "g", "h"], [
      { v: "a", w: "f" },
      { v: "a", w: "g" },
      { v: "a", w: "h" },
      { v: "b", w: "e" },
      { v: "c", w: "d" },
    ])
    expect(c).to.eq(7)
  }

}
