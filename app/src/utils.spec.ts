
import "./utils" // add getName on Object
import { UUID, getName, atou, utoa, btoa, atob } from "./utils"
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

  @test public base64isBackwardsCompatible() {
    let input1 = "Rx.Observable.of(1, 2, 3)"
    let input2 = `Rx.Observable.of(1, 2, 3)
  .map(x => x * 2)
  .subscribe()
`
    expect(utoa(input1)).to.eq(btoa(input1))
    expect(utoa(input2)).to.eq(btoa(input2))

    expect(atou(utoa(input1))).to.eq(atob(btoa(input1)))
    expect(atou(utoa(input2))).to.eq(atob(btoa(input2)))
  }

}
