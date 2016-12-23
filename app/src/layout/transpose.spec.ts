import { assert, expect, use as chaiUse } from "chai"
import { suite, test } from "mocha-typescript"
import { transpose } from "./transpose"
import { Graph } from "graphlib" 

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
      { w: "a", v: "c" }, 
      { w: "b", v: "d" }
    ])
    let i = [["c", "d"], ["a", "b"]]
    let e = i.map(i => i.slice(0))

    expect(transpose(i, g, "down")).to.deep.eq(e)
  }

  @test
  public "test simple"() {
    ///   -----c-----d----
    ///        | \ / |
    ///        | / \ |
    ///   -----a-----b----

    let g = asGraph([
      { w: "a", v: "c" }, 
      { w: "a", v: "d" }, 
      { w: "b", v: "c" }, 
      { w: "b", v: "d" }
    ])
    let i = [["c", "d"], ["a", "b"]]
    let e = i.map(i => i.slice(0))
    
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
      { w: "a", v: "f" },
      { w: "a", v: "g" },
      { w: "a", v: "h" },
      { w: "b", v: "d" },
      { w: "c", v: "e" },
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
      { w: "a", v: "f" },
      { w: "a", v: "g" },
      { w: "a", v: "h" },
      { w: "b", v: "e" },
      { w: "c", v: "d" },
    ])
    let i = [["d", "e", "f", "g", "h"], ["a", "b", "c"]]
    let e = [["d", "e", "f", "g", "h"], ["c", "b", "a"]]

    i = transpose(i, g, "down")
    i = transpose(i, g, "up")
    expect(i).to.deep.eq(e)
  }

}