// tslint:disable:max-line-length
import { Navigatable, Codes } from "./tabIndex"
import { expect } from "chai"
import { suite, test } from "mocha-typescript"

/**
 *   0   1||1   2|  4|  0 1 2    |4  |2
 *   0   1||1   2|  5|    1 2 3  |5  |2
 *   0   1||1   2|  6|      2    |6  |2
 */
let navA = () => new Navigatable("column", 0, [new Navigatable("column", 1), new Navigatable("column", 2, [
  new Navigatable("row", 4, [new Navigatable("column", 0), new Navigatable("column", 1), new Navigatable("column", 2)]),
  new Navigatable("row", 5, [new Navigatable("column", 1), new Navigatable("column", 2).isActive(), new Navigatable("column", 3)]),
  new Navigatable("row", 6, [new Navigatable("column", 2)]),
])])

@suite
export default class TabIndexSpec {

  @test
  public "find active"() {
    expect(navA().getActive().index).to.eq(2)
  }

  @test
  public "find next active in same row"() {
    expect(navA().getActive().next(Codes.LEFT, true).index).to.eq(1)
    expect(navA().getActive().next(Codes.RIGHT, true).index).to.eq(3)
  }

  @test
  public "find next active in above/below row"() {
    expect(navA().getActive().next(Codes.UP, true).index).to.eq(4)
    expect(navA().getActive().next(Codes.DOWN, true).index).to.eq(6)
  }

  @test
  public "parent indexOf"() {
    let inner = new Navigatable("row", 6)
    let cs = [new Navigatable("column", 1), new Navigatable("column", 2, [inner]).isActive(), new Navigatable("column", 3)]
    let nav = new Navigatable("row", 5, cs)
    expect(nav.indexOf(cs[0])).to.eq(0)
    expect(nav.indexOf(cs[1])).to.eq(1)
    expect(nav.indexOf(cs[2])).to.eq(2)

    expect(nav.indexOf(inner)).to.eq(1)
  }

  @test
  public "switch to other index if above/below contain different indices"() {
    let nav = navA()
    expect(nav.getActive().next(Codes.RIGHT).index).to.eq(3)
    nav.getActive().isActive(false).next(Codes.RIGHT).isActive()
    let active = nav.getActive()
    expect(active.index).to.eq(3)
    console.log(active)
    expect(active.parent.index).to.eq(5)
    expect(active.getParent(Codes.UP).index).to.eq(2)
    expect(active.next(Codes.UP, true).index).to.eq(4)

    nav = navA()
    nav.getActive().isActive(false).next(Codes.RIGHT).isActive()
    active = nav.getActive()
    expect(active.index).to.eq(3)
    expect(active.next(Codes.DOWN, true).index).to.eq(6)
  }

}
