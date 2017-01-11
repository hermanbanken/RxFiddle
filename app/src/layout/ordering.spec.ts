import { ordering } from "./ordering"
// import { assert, expect, use as chaiUse } from "chai"
import { Graph } from "graphlib"
import { suite, test } from "mocha-typescript"

@suite
export default class OrdeningSpec {

  @test
  public "test median n = 5"() {
    // expect(median([1,2,3,4,5])).to.eq(3)
    ordering([], new Graph())
  }

}
