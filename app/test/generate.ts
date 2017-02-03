import { InstrumentationTest } from "./instrumentationTest"
import { jsonify } from "./utils"
import { suite, test } from "mocha-typescript"
import * as Rx from "rx"

@suite
export class GenerateTest extends InstrumentationTest {

  // @test
  public "F"() {
    let fs = require("fs")

    let A = Rx.Observable.of(1, 2, 3)
      .map(i => "hello " + i)
      .filter(_ => true)
      .map(_ => _)
      .skip(1)
      .share()

    A.flatMapLatest(s => Rx.Observable.of("postfix").startWith(s))
      .groupBy(s => s[s.length - 1])
      .map(o => o.startWith("group of " + o.key))
      .mergeAll()
      .subscribe()

    fs.writeFileSync("static/F.json", jsonify(this.newcollector.messages))
  }

  @test
  public "G"() {
    let fs = require("fs")

    let A = Rx.Observable.of(1, 2, 3)
      .map(i => "hello " + i)
      .filter(_ => true)
      .subscribe()

    fs.writeFileSync("static/G.json", jsonify(this.newcollector.messages))
  }
}
