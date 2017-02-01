import { Path, Segment } from "./morph"
import { expect } from "chai"
import { suite, test } from "mocha-typescript"

@suite
export default class MorphSpec {

  public shor = `C 337.5 225, 337.5 225, 337.5 250 
                 C 337.5 275, 337.5 275, 337.5 300 
                 C 337.5 325, 412.5 325, 412.5 350`

  public long = `C 337.5 225, 337.5 225, 337.5 250 
                 C 337.5 275, 337.5 275, 337.5 300 
                 C 337.5 325, 412.5 325, 412.5 350 
                 C 412.5 350, 412.5 350, 412.5 350`

  @test
  public "parse paths"() {
    expect(Segment.parsePath("M 10 20")).to.be.deep.equal([
      new Segment("M", [10, 20])])

    expect(Segment.parsePath("M 10 20 L 30 20")).to.be.deep.equal([
      new Segment("M", [10, 20]),
      new Segment("L", [30, 20])])

    expect(Segment.parsePath("M 10 20, 10 20")).to.be.deep.equal([
      new Segment("M", [10, 20, 10, 20])])
  }

  @test
  public "M 10 20 + M 15 25"() {
    expect(new Segment("M", [10, 20]).combine(new Segment("M", [15, 25])))
      .to.have.lengthOf(1)
  }

  @test
  public "M 10 20 15 25 + M 20 30"() {
    expect(new Segment("M", [10, 20, 15, 25]).combine(new Segment("M", [20, 30])))
      .to.have.lengthOf(1)
  }

  @test
  public "m 5 5 + m 5 5"() {
    expect(new Segment("m", [5, 5]).combine(new Segment("m", [5, 5])))
      .to.have.lengthOf(1)
  }

  @test
  public "m 5 5 + m 10 5"() {
    expect(new Segment("m", [5, 5]).combine(new Segment("m", [10, 5])))
      .to.have.lengthOf(2)
  }

  @test
  public "morph +1"() {
    let s1 = /* 18 */ Path.parse(this.shor)
    let s2 = /* 24 */ Path.parse(this.long)
    expect(s1.expand(1).toString()).to.deep.eq(s2.toString())
    expect(s1.expand(1).segments.flatMap(s => s.points)).to.deep.eq(s2.segments.flatMap(s => s.points))
  }

}
