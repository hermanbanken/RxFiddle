"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
const graphutils_1 = require("../src/collector/graphutils");
const typedgraph_1 = require("../src/collector/typedgraph");
const deepCover_1 = require("../test/deepCover");
const instrumentationTest_1 = require("./instrumentationTest");
const chai_1 = require("chai");
const mocha_typescript_1 = require("mocha-typescript");
let LayoutTest = class LayoutTest extends instrumentationTest_1.InstrumentationTest {
    "test layout"() {
        //
        //   a
        //   |
        //   b
        //   |\
        //   c d
        // 
        let g = new typedgraph_1.default();
        g.setNode("a", "a");
        g.setNode("b", "b");
        g.setNode("c", "e");
        g.setNode("d", "d");
        g.setEdge("a", "b", {});
        g.setEdge("b", "c", {});
        g.setEdge("b", "d", {});
        let f = g.flatMap((id, l) => [{ id, label: { hierarchicOrder: [] } }], (id, label) => [{ id, label }]);
        let lines = [["a", "b", "d"], ["a", "b", "c"]];
        let actual = graphutils_1.structureLayout(graphutils_1.rankLongestPathGraph(f)).layout.sort((a, b) => a.node.localeCompare(b.node));
        let expected = [
            { node: "a" /*, x: 1, y: 0,*/ },
            { node: "b" /*, x: 1, y: 1,*/ },
            { node: "c" /*, x: 0, y: 2,*/ },
            { node: "d" /*, x: 1, y: 2,*/ },
        ];
        deepCover_1.default(actual, expected);
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
        let g = new typedgraph_1.default();
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
        let f = g.flatMap((id, l) => [{ id, label: { hierarchicOrder: [] } }], (id, label) => [{ id, label }]);
        let actual = graphutils_1.structureLayout(graphutils_1.rankLongestPathGraph(f)).layout.sort((a, b) => a.node.localeCompare(b.node));
        let expected = [
            { node: "f" /*, x: 1, y: 0,*/ },
            { node: "e" /*, x: 1, y: 1,*/ },
            { node: "a" /*, x: 0, y: 1,*/ },
            { node: "b" /*, x: 1, y: 2,*/ },
            { node: "c" /*, x: 0, y: 3,*/ },
            { node: "d" /*, x: 1, y: 3,*/ },
        ].sort((a, b) => a.node.localeCompare(b.node));
        deepCover_1.default(actual, expected);
    }
    "test priority layout reordering"() {
        let node = (n, i, barycenter, priority, isDummy) => {
            return {
                node: n, x: i, y: 0,
                isDummy, barycenter, priority,
                relative: [], lines: [],
                hierarchicOrder: [],
            };
        };
        let row = [
            node("v1", 0, 2, 5, false),
            node("v2", 1, 5, 10, false),
            node("v3", 2, 7, 3, false),
            node("v4", 3, 7, 2, false),
        ];
        graphutils_1.priorityLayoutAlign(row);
        chai_1.expect(row.map(r => r.x)).to.deep.equal([2, 5, 7, 8]);
        deepCover_1.default(row, [
            node("v1", 2, 2, 5, false),
            node("v2", 5, 5, 10, false),
            node("v3", 7, 7, 3, false),
            node("v4", 8, 7, 2, false),
        ]);
    }
    "test priority layout reordering 2"() {
        let node = (n, i, barycenter, priority, isDummy) => {
            return {
                node: n, x: i, y: 0,
                isDummy, barycenter, priority,
                relative: [], lines: [],
                hierarchicOrder: [],
            };
        };
        let prios = [
            [10, 8, 4, 2],
            [8, 4, 2, 10],
            [4, 2, 10, 8],
            [2, 10, 8, 4],
            [8, 10, 4, 2],
            [10, 8, 2, 4],
            [4, 2, 8, 10],
            [2, 4, 10, 8],
        ];
        for (let prio of prios) {
            let row = [
                node("v1", 2, 0, prio[0], false),
                node("v2", 5, 4, prio[1], false),
                node("v3", 7, 8, prio[2], false),
                node("v4", 13, 12, prio[3], false),
            ];
            graphutils_1.priorityLayoutAlign(row);
            deepCover_1.default(row, [
                node("v1", 0, 0, prio[0], false),
                node("v2", 4, 4, prio[1], false),
                node("v3", 8, 8, prio[2], false),
                node("v4", 12, 12, prio[3], false),
            ]);
        }
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
__decorate([
    mocha_typescript_1.test
], LayoutTest.prototype, "test priority layout reordering 2", null);
LayoutTest = __decorate([
    mocha_typescript_1.suite
], LayoutTest);
exports.LayoutTest = LayoutTest;
//# sourceMappingURL=layout.js.map