"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
const instrumentationTest_1 = require("./instrumentationTest");
const mocha_typescript_1 = require("mocha-typescript");
const Rx = require("rx");
// @suite
class SubscriptionTest extends instrumentationTest_1.InstrumentationTest {
    "subscription sources"() {
        Rx.Observable.of(1, 2, 3)
            .map(s => s)
            .filter(o => true)
            .subscribe();
        // let lens = this.rxcollector.lens()
        // let a = lens.find("of").subscriptions().all()[0]
        // let b = lens.find("map").subscriptions().all()[0]
        // let c = lens.find("filter").subscriptions().all()[0]
        // expect(a.sinks).to.deep.equal([b.id], "no sink for of -> map")
        // expect(b.sinks).to.deep.equal([c.id], "no sink for map -> filter")
    }
    "subscription sources groupBy"() {
        Rx.Observable.of(1, 2, 3)
            .map(s => s)
            .groupBy(v => v)
            .mergeAll()
            .subscribe();
        // let lens = this.rxcollector.lens()
        // let a = lens.find("of").subscriptions().all()[0]
        // let b = lens.find("map").subscriptions().all()[0]
        // let c = lens.find("groupBy").subscriptions().all()[0]
        // let d = lens.find("mergeAll").subscriptions().all()[0]
        // expect(a && a.sinks).to.deep.equal([b.id], "no sink for of -> map")
        // expect(b && b.sinks).to.deep.equal([c.id], "no sink for map -> groupBy")
        // expect(c && c.sinks).to.deep.equal([d.id], "no sink for groupBy -> mergeAll")
    }
}
__decorate([
    mocha_typescript_1.test
], SubscriptionTest.prototype, "subscription sources", null);
__decorate([
    mocha_typescript_1.test
], SubscriptionTest.prototype, "subscription sources groupBy", null);
exports.SubscriptionTest = SubscriptionTest;
//# sourceMappingURL=subscriptions.js.map