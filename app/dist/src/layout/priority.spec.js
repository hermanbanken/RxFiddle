"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
const deepCover_1 = require("../../test/deepCover");
const priority_1 = require("./priority");
const graphlib_1 = require("graphlib");
const mocha_typescript_1 = require("mocha-typescript");
function asGraph(es) {
    let g = new graphlib_1.Graph();
    es.forEach(({ v, w }) => g.setEdge(v, w));
    return g;
}
let PriorityLayoutSpec = class PriorityLayoutSpec {
    "test simple"() {
        ///  c     d
        ///  | \ / |
        ///  | / \ |
        ///  a     b
        let ranks = [["c", "d"], ["a", "b"]];
        let g = asGraph([
            { v: "a", w: "c" },
            { v: "a", w: "d" },
            { v: "b", w: "c" },
            { v: "b", w: "d" },
        ]);
        let res = priority_1.priorityLayout(ranks, g);
        deepCover_1.default(res, [
            { id: "c", x: 0, y: 0 },
            { id: "d", x: 1, y: 0 },
            { id: "a", x: 0, y: 1 },
            { id: "b", x: 1, y: 1 },
        ]);
    }
};
__decorate([
    mocha_typescript_1.test
], PriorityLayoutSpec.prototype, "test simple", null);
PriorityLayoutSpec = __decorate([
    mocha_typescript_1.suite
], PriorityLayoutSpec);
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = PriorityLayoutSpec;
//# sourceMappingURL=priority.spec.js.map