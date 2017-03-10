import { ordering, fixingSort } from "./ordering"
import { expect } from "chai"
import { Graph } from "graphlib"
import { suite, test } from "mocha-typescript"

@suite
export default class OrderingSpec {

  @test
  public "test median n = 5"() {
    // TODO fill test
    // expect(median([1,2,3,4,5])).to.eq(3)
    ordering([], new Graph(), { hierarchies: [] })
  }

  @test
  public "fixing sort"() {
    expect(fixingSort(["1"])("0", "1")).to.eq(1)
    expect(fixingSort(["0"])("0", "1")).to.eq(-1)
    expect(fixingSort(["1"])("2", "3")).to.eq(0)
  }


}
