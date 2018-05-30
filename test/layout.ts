import { LayoutItem, priorityLayoutAlign, rankLongestPathGraph, structureLayout } from "../src/collector/graphutils"
import TypedGraph from "../src/collector/typedgraph"
import deepCover from "../test/deepCover"
import { InstrumentationTest } from "./instrumentationTest"
import { expect } from "chai"
import { suite, test } from "mocha-typescript"

@suite
export class LayoutTest extends InstrumentationTest {

  @test
  public "test layout"() {
    //
    //   a
    //   |
    //   b
    //   |\
    //   c d
    // 
    let g = new TypedGraph<string, any>()
    g.setNode("a", "a")
    g.setNode("b", "b")
    g.setNode("c", "e")
    g.setNode("d", "d")
    g.setEdge("a", "b", {})
    g.setEdge("b", "c", {})
    g.setEdge("b", "d", {})

    let f = g.flatMap((id, l) => [{ id, label: { hierarchicOrder: [] } }], (id, label) => [{ id, label }])

    let lines = [["a", "b", "d"], ["a", "b", "c"]]

    let actual = structureLayout(rankLongestPathGraph(f)).layout.sort((a, b) => a.node.localeCompare(b.node))
    let expected = [
      { node: "a" /*, x: 1, y: 0,*/ }, // lines: [0, 1], relative: [] },
      { node: "b" /*, x: 1, y: 1,*/ }, // lines: [0, 1], relative: ["a"] },
      { node: "c" /*, x: 0, y: 2,*/ }, // lines: [1], relative: ["b"] },
      { node: "d" /*, x: 1, y: 2,*/ }, // lines: [0], relative: ["b"] },
    ]

    deepCover(actual, expected)
  }

  @test
  public "test complex layout"() {
    //
    //   f
    //   |
    //   e a
    //   |/
    //   b
    //   |\
    //   d c
    // 
    let g = new TypedGraph<string, any>()
    g.setNode("a", "a")
    g.setNode("b", "b")
    g.setNode("c", "e")
    g.setNode("d", "d")
    g.setNode("e", "e")
    g.setNode("f", "f")
    g.setEdge("a", "b", {})
    g.setEdge("b", "c", {})
    g.setEdge("b", "d", {})
    g.setEdge("f", "e", {})
    g.setEdge("e", "b", {})

    let lines = [["a", "b", "c"], ["f", "e", "b", "d"]]

    let f = g.flatMap((id, l) => [{ id, label: { hierarchicOrder: [] } }], (id, label) => [{ id, label }])

    let actual = structureLayout(rankLongestPathGraph(f)).layout.sort((a, b) => a.node.localeCompare(b.node))
    let expected = [
      { node: "f" /*, x: 1, y: 0,*/ }, // lines: [1], relative: [] },
      { node: "e" /*, x: 1, y: 1,*/ }, // lines: [1], relative: ["f"] },
      { node: "a" /*, x: 0, y: 1,*/ }, // lines: [0], relative: [] },
      { node: "b" /*, x: 1, y: 2,*/ }, // lines: [0, 1], relative: ["a", "e"] },
      { node: "c" /*, x: 0, y: 3,*/ }, // lines: [0], relative: ["b"] },
      { node: "d" /*, x: 1, y: 3,*/ }, // lines: [1], relative: ["b"] },
    ].sort((a, b) => a.node.localeCompare(b.node))

    deepCover(actual, expected)
  }

  @test
  public "test priority layout reordering"() {
    let node = (n: string, i: number, barycenter: number, priority: number, isDummy: boolean) => {
      return {
        node: n, x: i, y: 0,
        isDummy, barycenter, priority,
        relative: [] as string[], lines: [] as number[],
        hierarchicOrder: <number[]>[],
      }
    }

    let row: (LayoutItem<string> & { priority: number })[] = [
      node("v1", 0, 2, 5, false),
      node("v2", 1, 5, 10, false),
      node("v3", 2, 7, 3, false),
      node("v4", 3, 7, 2, false),
    ]

    priorityLayoutAlign(row)

    expect(row.map(r => r.x)).to.deep.equal([2, 5, 7, 8])
    deepCover(row, [
      node("v1", 2, 2, 5, false),
      node("v2", 5, 5, 10, false),
      node("v3", 7, 7, 3, false),
      node("v4", 8, 7, 2, false),
    ])
  }

  @test
  public "test priority layout reordering 2"() {
    let node = (n: string, i: number, barycenter: number, priority: number, isDummy: boolean) => {
      return {
        node: n, x: i, y: 0,
        isDummy, barycenter, priority,
        relative: [] as string[], lines: [] as number[],
        hierarchicOrder: <number[]>[],
      }
    }

    let prios = [
      [10, 8, 4, 2],
      [8, 4, 2, 10],
      [4, 2, 10, 8],
      [2, 10, 8, 4],
      [8, 10, 4, 2],
      [10, 8, 2, 4],
      [4, 2, 8, 10],
      [2, 4, 10, 8],
    ]

    for (let prio of prios) {
      let row: (LayoutItem<string> & { priority: number })[] = [
        node("v1", 2, 0, prio[0], false),
        node("v2", 5, 4, prio[1], false),
        node("v3", 7, 8, prio[2], false),
        node("v4", 13, 12, prio[3], false),
      ]

      priorityLayoutAlign(row)

      deepCover(row, [
        node("v1", 0, 0, prio[0], false),
        node("v2", 4, 4, prio[1], false),
        node("v3", 8, 8, prio[2], false),
        node("v4", 12, 12, prio[3], false),
      ])
    }

  }

}
