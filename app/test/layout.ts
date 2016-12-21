import { InstrumentationTest } from "./instrumentationTest"
import { assert, expect, use as chaiUse } from "chai"
import { suite, test } from "mocha-typescript"
import { Graph } from "graphlib"
import * as Rx from "rx"
import { structureLayout, LayoutItem, priorityLayoutAlign, rankLongestPathGraph } from "../src/collector/graphutils"
import TypedGraph from "../src/collector/typedgraph"

function deepCover(actual: any, expected: any, message: string = "__root__") {
  let errors: Error[] = []
  if (typeof expected === "object" && !Array.isArray(expected)) {
    expect(typeof actual).to.be.equal("object")
    for (let key in expected) {
      try {
        deepCover(actual[key], expected[key], message+`[${key}]`)
      } catch(e) {
        errors.push(e)
      }
    }
    if(errors.length) {
      console.log("20", errors)
      assert.fail(actual, expected, errors.join("\n"))
    }
  }
  else if(typeof expected === "object") {
    expect(actual).to.be.instanceof(Array)
    expected.forEach((e: any, index: number) => {
      try {
        deepCover(actual[index], e, message+`[${index}]`)
      } catch(e) {
        errors.push(e)
      }
    })
    if(errors.length) {
      console.log("34", errors)
      assert.fail(actual, expected, errors.join("\n"))
    }
  }
  else {
    assert.equal(actual, expected, message)
  }
}

// add Chai language chain method
// chaiUse((chai, utils) => {
//   chai.Assertion.overwriteMethod('include', function(__super: any) {

//     return function (expected: any) {
//       let actual = this._obj;
      
//       let match = (actual: any, expected: any) => {
//         if (typeof expected === "object" && !Array.isArray(expected)) {
//           this.expect(typeof actual).to.be.equal("object")
//           for (let key in expected) {
//             match(actual[key], expected[key])
//           }
//         }
//         else if(typeof expected === "object") {
//           this.expect(actual).to.be.instanceof(Array)
//           expected.forEach((e: any, index: number) => match(e, actual[index]))
//         }
//         else {
//           this.expect(actual).to.be.equal(expected)
//         }
//       }

//       // // first, our instanceof check, shortcut
//       // new Assertion(this._obj).to.be.instanceof(Model);

//       // // second, our type check
//       // this.assert(
//       //     obj._type === type
//       //   , "expected #{this} to be of type #{exp} but got #{act}"
//       //   , "expected #{this} to not be of type #{act}"
//       //   , type        // expected
//       //   , obj._type   // actual
//       // );
//     };
//   })
// });

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
    let g = new TypedGraph<string,any>()
    g.setNode("a", "a")
    g.setNode("b", "b")
    g.setNode("c", "e")
    g.setNode("d", "d")
    g.setEdge("a", "b", {})
    g.setEdge("b", "c", {})
    g.setEdge("b", "d", {})

    let f = g.flatMap((id, l) => [{id, label: { hierarchicOrder: [] }}], (id, label) => [{ id, label }])

    let lines = [["a", "b", "d"], ["a", "b", "c"]]

    let actual = structureLayout(rankLongestPathGraph(f)).layout.sort((a,b) => a.node.localeCompare(b.node))
    let expected = [
      { node: "a", x: 1, y: 0, }, // lines: [0, 1], relative: [] },
      { node: "b", x: 1, y: 1, }, // lines: [0, 1], relative: ["a"] },
      { node: "c", x: 0, y: 2, }, // lines: [1], relative: ["b"] },
      { node: "d", x: 1, y: 2, }, // lines: [0], relative: ["b"] },
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
    let g = new TypedGraph<string,any>()
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

    let f = g.flatMap((id, l) => [{id, label: { hierarchicOrder: [] }}], (id, label) => [{ id, label }])

    let actual = structureLayout(rankLongestPathGraph(f)).layout.sort((a,b) => a.node.localeCompare(b.node))
    let expected = [
      { node: "f", x: 1, y: 0, }, // lines: [1], relative: [] },
      { node: "e", x: 1, y: 1, }, // lines: [1], relative: ["f"] },
      { node: "a", x: 0, y: 1, }, // lines: [0], relative: [] },
      { node: "b", x: 1, y: 2, }, // lines: [0, 1], relative: ["a", "e"] },
      { node: "c", x: 0, y: 3, }, // lines: [0], relative: ["b"] },
      { node: "d", x: 1, y: 3, }, // lines: [1], relative: ["b"] },
    ].sort((a,b) => a.node.localeCompare(b.node))

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
      node("v2", 1, 5,10, false),
      node("v3", 2, 7, 3, false),
      node("v4", 3, 7, 2, false),
    ]

    priorityLayoutAlign(row)

    expect(row.map(r => r.x)).to.deep.equal([2, 5, 7, 8])
    deepCover(row, [
      node("v1", 2, 2, 5, false),
      node("v2", 5, 5,10, false),
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

    for(let prio of prios) {
      let row: (LayoutItem<string> & { priority: number })[] = [
        node("v1", 2, 0, prio[0], false),
        node("v2", 5, 4, prio[1], false),
        node("v3", 7, 8, prio[2], false),
        node("v4",13,12, prio[3], false),
      ]

      priorityLayoutAlign(row)

      deepCover(row, [
        node("v1", 0, 0, prio[0], false),
        node("v2", 4, 4, prio[1], false),
        node("v3", 8, 8, prio[2], false),
        node("v4",12,12, prio[3], false),
      ])
    }

  }

}
