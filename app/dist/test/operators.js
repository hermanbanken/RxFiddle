"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
const instrumentationTest_1 = require("./instrumentationTest");
const utils_1 = require("./utils");
const mocha_typescript_1 = require("mocha-typescript");
const Rx = require("rx");
let rxProto = Rx.Observable.prototype;
function complexObs() {
    let A = Rx.Observable.of(1, 2, 3)
        .map(i => "hello " + i)
        .filter(_ => true)
        .map(_ => _)
        .skip(1)
        .share();
    A.flatMapLatest(s => Rx.Observable.of("postfix").startWith(s))
        .groupBy(s => s[s.length - 1])
        .map(o => o.startWith("group of " + o.key))
        .mergeAll()
        .subscribe();
}
let OperatorTest = class OperatorTest extends instrumentationTest_1.InstrumentationTest {
    "write file"() {
        complexObs();
        let fs = require("fs");
        fs.writeFileSync("static/G_newstyle.json", utils_1.jsonify(this.newcollector.messages));
    }
};
__decorate([
    mocha_typescript_1.test
], OperatorTest.prototype, "write file", null);
OperatorTest = __decorate([
    mocha_typescript_1.suite
], OperatorTest);
exports.OperatorTest = OperatorTest;
//# sourceMappingURL=operators.js.map