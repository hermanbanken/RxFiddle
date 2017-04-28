
import "./utils" // add getName on Object
import { UUID, getName } from "./utils"
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
    expect(getName.call(foo)).to.eq("Foo")
  }

}
