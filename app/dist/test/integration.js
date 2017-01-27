"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
const grapher_1 = require("../src/collector/grapher");
const instrumentationTest_1 = require("./instrumentationTest");
const mocha_typescript_1 = require("mocha-typescript");
const Rx = require("rx");
let IntegrationTest = class IntegrationTest extends instrumentationTest_1.InstrumentationTest {
    "subscription sources"() {
        let left = Rx.Observable
            .zip([
            Rx.Observable.of(1).map(a => a),
            Rx.Observable.of(2).filter(a => true).map(a => a),
        ], (a, b) => ({ a, b }))
            .filter(a => true);
        let right = Rx.Observable
            .of("a")
            .map(a => 1)
            .scan((a, n) => a + n, 0);
        let merged = Rx.Observable.merge(...[left, left, right, right]
            .map((obs) => obs
            .map(a => a)
            .filter((a) => true)
            .map(a => a)));
        merged.subscribe();
        let grapher = new grapher_1.Grapher(this.rxcollector);
        grapher.process();
        // let leveledDot = toDot(
        //   grapher.leveledGraph.filterNodes((n, l) => l.level !== "code"),
        //   n => {
        //     let v = grapher.leveledGraph.node((n as any))
        //     return ({ label: v.level === "observable" ? (v.payload as any).method : v.id })
        //   },
        //   ({ v, w }) => {
        //     let e = grapher.leveledGraph.edge(v, w) as LayerCrossingEdge
        //     if (typeof e !== "undefined" && typeof e.upper !== "undefined" && e.upper !== e.lower) {
        //       return { constraint: false, type: "s" }
        //     } else {
        //       return { type: "s" }
        //     }
        //   }
        // )
        // console.log(leveledDot)
        // console.log(layout(grapher.leveledGraph))
        // TODO:
        // get <rows> containing node ids
        // ordering(<rows>)
        // replace single obs with their subscriptions
        // do local-orderning per set of subs, traversing each tree of the observable
        // output and visualize
        // ...
        // profit
        // OLD, remove
        // let lens = this.collector.lens()
        // let a = lens.find("of").subscriptions().all()[0]
        // let b = lens.find("map").subscriptions().all()[0]
        // let c = lens.find("filter").subscriptions().all()[0]
        // expect(a.sinks).to.deep.equal([b.id], "no sink for of -> map")
        // expect(b.sinks).to.deep.equal([c.id], "no sink for map -> filter")
    }
};
__decorate([
    mocha_typescript_1.test
], IntegrationTest.prototype, "subscription sources", null);
IntegrationTest = __decorate([
    mocha_typescript_1.suite
], IntegrationTest);
exports.IntegrationTest = IntegrationTest;
//# sourceMappingURL=integration.js.map