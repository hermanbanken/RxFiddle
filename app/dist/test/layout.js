"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
const instrumentationTest_1 = require("./instrumentationTest");
const chai_1 = require("chai");
const mocha_typescript_1 = require("mocha-typescript");
const graphlib_1 = require("graphlib");
const graphutils_1 = require("../src/collector/graphutils");
function deepCover(actual, expected, message = "__root__") {
    let errors = [];
    if (typeof expected === "object" && !Array.isArray(expected)) {
        chai_1.expect(typeof actual).to.be.equal("object");
        for (let key in expected) {
            try {
                deepCover(actual[key], expected[key], message + `[${key}]`);
            }
            catch (e) {
                errors.push(e);
            }
        }
        if (errors.length) {
            console.log("20", errors);
            chai_1.assert.fail(actual, expected, errors.join("\n"));
        }
    }
    else if (typeof expected === "object") {
        chai_1.expect(actual).to.be.instanceof(Array);
        expected.forEach((e, index) => {
            try {
                deepCover(actual[index], e, message + `[${index}]`);
            }
            catch (e) {
                errors.push(e);
            }
        });
        if (errors.length) {
            console.log("34", errors);
            chai_1.assert.fail(actual, expected, errors.join("\n"));
        }
    }
    else {
        chai_1.assert.equal(actual, expected, message);
    }
}
// add Chai language chain method
// chaiUse((chai, utils) => {
//   chai.Assertion.overwriteMethod('include', function(__super: any) {
//     return function (expected: any) {
//       let actual = this._obj;
//       let match = (actual: any, expected: any) => {
//         if (typeof expected === "object" && !Array.isArray(expected)) {
//           this.expect(typeof actual).to.be.equal("object")
//           for (let key in expected) {
//             match(actual[key], expected[key])
//           }
//         }
//         else if(typeof expected === "object") {
//           this.expect(actual).to.be.instanceof(Array)
//           expected.forEach((e: any, index: number) => match(e, actual[index]))
//         }
//         else {
//           this.expect(actual).to.be.equal(expected)
//         }
//       }
//       // // first, our instanceof check, shortcut
//       // new Assertion(this._obj).to.be.instanceof(Model);
//       // // second, our type check
//       // this.assert(
//       //     obj._type === type
//       //   , "expected #{this} to be of type #{exp} but got #{act}"
//       //   , "expected #{this} to not be of type #{act}"
//       //   , type        // expected
//       //   , obj._type   // actual
//       // );
//     };
//   })
// });
let LayoutTest = class LayoutTest extends instrumentationTest_1.InstrumentationTest {
    "test layout"() {
        //
        //   a
        //   |
        //   b
        //   |\
        //   c d
        // 
        let g = new graphlib_1.Graph();
        g.setNode("a", "a");
        g.setNode("b", "b");
        g.setNode("c", "e");
        g.setNode("d", "d");
        g.setEdge("a", "b", {});
        g.setEdge("b", "c", {});
        g.setEdge("b", "d", {});
        let lines = [["a", "b", "d"], ["a", "b", "c"]];
        let actual = graphutils_1.structureLayout(g).layout.sort((a, b) => a.node.localeCompare(b.node));
        let expected = [
            { node: "a", x: 1, y: 0, },
            { node: "b", x: 1, y: 1, },
            { node: "c", x: 0, y: 2, },
            { node: "d", x: 1, y: 2, },
        ];
        deepCover(actual, expected);
    }
    "test complex layout"() {
        //
        //   f
        //   |
        //   e a
        //   |/
        //   b
        //   |\
        //   d c
        // 
        let g = new graphlib_1.Graph();
        g.setNode("a", "a");
        g.setNode("b", "b");
        g.setNode("c", "e");
        g.setNode("d", "d");
        g.setNode("e", "e");
        g.setNode("f", "f");
        g.setEdge("a", "b", {});
        g.setEdge("b", "c", {});
        g.setEdge("b", "d", {});
        g.setEdge("f", "e", {});
        g.setEdge("e", "b", {});
        let lines = [["a", "b", "c"], ["f", "e", "b", "d"]];
        let actual = graphutils_1.structureLayout(g).layout.sort((a, b) => a.node.localeCompare(b.node));
        let expected = [
            { node: "f", x: 1, y: 0, },
            { node: "e", x: 1, y: 1, },
            { node: "a", x: 0, y: 1, },
            { node: "b", x: 1, y: 2, },
            { node: "c", x: 0, y: 3, },
            { node: "d", x: 1, y: 3, },
        ].sort((a, b) => a.node.localeCompare(b.node));
        deepCover(actual, expected);
    }
    "test priority layout reordering"() {
        let node = (n, i, barycenter, priority, isDummy) => {
            return {
                node: n, x: i, y: 0,
                isDummy, barycenter, priority,
                relative: [], lines: [],
            };
        };
        let row = [
            node("v1", 0, 2, 5, false),
            node("v2", 1, 5, 10, false),
            node("v3", 2, 7, 3, false),
            node("v4", 3, 7, 2, false),
        ];
        graphutils_1.priorityLayoutReorder(row);
        deepCover(row, [
            node("v1", 2, 2, 5, false),
            node("v2", 5, 5, 10, false),
            node("v3", 7, 7, 3, false),
            node("v4", 8, 7, 2, false),
        ]);
    }
};
__decorate([
    mocha_typescript_1.test
], LayoutTest.prototype, "test layout", null);
__decorate([
    mocha_typescript_1.test
], LayoutTest.prototype, "test complex layout", null);
__decorate([
    mocha_typescript_1.test
], LayoutTest.prototype, "test priority layout reordering", null);
LayoutTest = __decorate([
    mocha_typescript_1.suite
], LayoutTest);
exports.LayoutTest = LayoutTest;
//# sourceMappingURL=layout.js.map