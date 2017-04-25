import "./utils" // add getName on Object
import { UUID } from "./utils"
import { expect } from "chai"
import { suite, test } from "mocha-typescript"

@suite
export default class UtilsTest {

  @test public uuid() {
    expect(UUID().length).to.eq(36)
  }

  @test public objectPrototypeGetName() {
    function Foo() { /* */ }
    let foo = new (Foo as any)()
    expect(foo.getName()).to.eq("Foo")
  }

}
