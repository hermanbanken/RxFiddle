import { median, wmedian } from "./median"
import { expect } from "chai"
import { Graph } from "graphlib"
import { suite, test } from "mocha-typescript"

function asGraph(es: { v: string, w: string }[]): Graph {
  let g = new Graph()
  es.forEach(({ v, w }) => g.setEdge(v, w))
  return g
}

@suite
export default class MedianSpec {

  @test
  public "test median n = 5"() {
    expect(median([1, 2, 3, 4, 5])).to.eq(3)
  }

  @test
  public "test median n = 4"() {
    expect(median([1, 2, 4, 5])).to.eq(4)
  }

  @test
  public "test median n = 2"() {
    expect(median([2, 5])).to.eq(3.5)
  }

  @test
  public "test median n = 1"() {
    expect(median([3])).to.eq(3)
  }

  @test
  public "test straight"() {
    ///   -----c-----d----
    ///        |     |
    ///        |     |
    ///   -----a-----b----

    let g = asGraph([
      { v: "c", w: "a" },
      { v: "d", w: "b" },
    ])
    let i = [["c", "d"], ["a", "b"]]
    let e = i.map(ii => ii.slice(0))

    wmedian(i, g, "down")
    expect(i).to.deep.eq(e)
  }

  @test
  public "test simple"() {
    ///   -----c-----d----
    ///        | \ / |
    ///        | / \ |
    ///   -----a-----b----

    let g = asGraph([
      { v: "c", w: "a" },
      { v: "d", w: "a" },
      { v: "c", w: "b" },
      { v: "d", w: "b" },
    ])
    let i = [["c", "d"], ["a", "b"]]
    let e = i.map(ii => ii.slice(0))

    wmedian(i, g, "down")
    wmedian(i, g, "up")

    expect(i).to.deep.eq(e)
  }

  @test
  public "test 6"() {
    ///   -----d-e-f-g-h--
    ///           / / /
    ///          ////
    ///         //   d e
    ///        /     | |
    ///   -----a-----b-c--

    let g = asGraph([
      { v: "f", w: "a" },
      { v: "g", w: "a" },
      { v: "h", w: "a" },
      { v: "d", w: "b" },
      { v: "e", w: "c" },
    ])
    let i = [["d", "e", "f", "g", "h"], ["a", "b", "c"]]
    let e = [["d", "e", "f", "g", "h"], ["b", "c", "a"]]

    wmedian(i, g, "down")
    wmedian(i, g, "up")
    expect(i).to.deep.eq(e)
  }

  @test
  public "test 7"() {
    ///   -----d-e-f-g-h--
    ///           / / /
    ///          ////
    ///         //   e d
    ///        /     | |
    ///   -----a-----b-c--

    let g = asGraph([
      { v: "f", w: "a" },
      { v: "g", w: "a" },
      { v: "h", w: "a" },
      { v: "e", w: "b" },
      { v: "d", w: "c" },
    ])
    let i = [["d", "e", "f", "g", "h"], ["a", "b", "c"]]
    let e = [["d", "e", "f", "g", "h"], ["c", "b", "a"]]

    wmedian(i, g, "down")
    wmedian(i, g, "up")
    expect(i).to.deep.eq(e)
  }

}
