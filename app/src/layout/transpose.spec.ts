import { fixingSort } from "./ordering"
import { transpose, debug } from "./transpose"
import { expect } from "chai"
import { Graph } from "graphlib"
import { suite, test } from "mocha-typescript"

function asGraph(es: { v: string, w: string }[]): Graph {
  let g = new Graph()
  es.forEach(({ v, w }) => g.setEdge(v, w))
  return g
}

@suite
export default class TransposeSpec {

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

    expect(transpose(i, g, "down")).to.deep.eq(e)
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

    i = transpose(i, g, "down")
    i = transpose(i, g, "up")
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

    i = transpose(i, g, "down")
    i = transpose(i, g, "up")
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

    i = transpose(i, g, "down")
    i = transpose(i, g, "up")
    expect(i).to.deep.eq(e)
  }

  @test
  public "test 7 external sort"() {
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

    ///   -e-d-f-g-h--
    ///    | | | | |
    ///    | | | | |
    ///    | | | |/ 
    ///    | | | /   
    ///   -b-c-a------
    let e = [["e", "d", "f", "g", "h"], ["b", "c", "a"]]

    i = transpose(i, g, "down", fixingSort(["e", "b"]))
    i = transpose(i, g, "up", fixingSort(["e", "b"]))
    expect(i).to.deep.eq(e)
  }

}
