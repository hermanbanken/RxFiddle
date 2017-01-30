"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
const deepCover_1 = require("../../test/deepCover");
const typedgraph_1 = require("../collector/typedgraph");
const crossings_1 = require("../layout/crossings");
const transpose_1 = require("../layout/transpose");
const layout_1 = require("./layout");
const chai_1 = require("chai");
const graphlib_1 = require("graphlib");
const mocha_typescript_1 = require("mocha-typescript");
function asGraph(es) {
    let g = new graphlib_1.Graph();
    es.forEach(({ v, w }) => g.setEdge(v, w));
    return g;
}
let VisualizationLayoutTest = class VisualizationLayoutTest {
    constructor() {
        this.rowEdges = [
            { v: "a", w: "1" },
            { v: "a", w: "2" },
            { v: "b", w: "1" },
            { v: "c", w: "1" },
            { v: "d", w: "1" },
        ];
    }
    "test sample E, crossings before"() {
        let c = crossings_1.crossings(["a", "b", "c", "d"], ["1", "2"], this.rowEdges);
        chai_1.expect(c).to.eq(3);
    }
    "test sample E, crossings fixed"() {
        let c = crossings_1.crossings(["a", "b", "c", "d"], ["2", "1"], this.rowEdges);
        chai_1.expect(c).to.eq(0);
    }
    "test sample E, transpose"() {
        let g = asGraph(this.rowEdges);
        ///   -a---b-c-d-
        ///    |   / / /
        ///    |\ ////
        ///    | //
        ///    |/  \ 
        ///   -1----2-----
        let i = [["a", "b", "c", "d"], ["1", "2"]];
        ///   -a---b-c-d-
        ///    |   | | |
        ///    |\  | | |
        ///    |  \| | |
        ///    |   \\|/
        ///   -2-----1-----
        let e = [["a", "b", "c", "d"], ["2", "1"]];
        i = transpose_1.transpose(i, g, "down");
        i = transpose_1.transpose(i, g, "up");
        chai_1.expect(i.join(";")).to.deep.eq(e.join(";"));
        chai_1.expect(crossings_1.crossings(i[0], i[1], this.rowEdges)).to.eq(0);
    }
    "test sample E, fully"() {
        let g = new typedgraph_1.default();
        let es = "0/2,7/8,2/8,2/7,24/26,26/7,36/38,38/7,48/50,50/7";
        es.split(",").map(e => e.split("/")).forEach(([v, w]) => {
            g.setEdge(v, w);
            g.setNode(v, {});
            g.setNode(w, {});
        });
        let actual = layout_1.default(g);
        let expected = [
            { id: "24", x: 0, y: 0 },
            { id: "36", x: 1, y: 0 },
            { id: "48", x: 2, y: 0 },
            { id: "0", x: 3, y: 0 },
            { id: "26", x: 0, y: 1 },
            { id: "38", x: 1, y: 1 },
            { id: "50", x: 2, y: 1 },
            { id: "2", x: 3, y: 1 },
            { id: "7", x: 1.25, y: 2 },
            { id: "8", x: 2.25, y: 3 },
        ];
        deepCover_1.default(actual[0].nodes, expected);
    }
};
__decorate([
    mocha_typescript_1.test
], VisualizationLayoutTest.prototype, "test sample E, crossings before", null);
__decorate([
    mocha_typescript_1.test
], VisualizationLayoutTest.prototype, "test sample E, crossings fixed", null);
__decorate([
    mocha_typescript_1.test
], VisualizationLayoutTest.prototype, "test sample E, transpose", null);
__decorate([
    mocha_typescript_1.test
], VisualizationLayoutTest.prototype, "test sample E, fully", null);
VisualizationLayoutTest = __decorate([
    mocha_typescript_1.suite
], VisualizationLayoutTest);
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = VisualizationLayoutTest;
//# sourceMappingURL=layout.spec.js.map