"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
const chai_1 = require("chai");
const mocha_typescript_1 = require("mocha-typescript");
const transpose_1 = require("./transpose");
const graphlib_1 = require("graphlib");
function asGraph(es) {
    let g = new graphlib_1.Graph();
    es.forEach(({ v, w }) => g.setEdge(v, w));
    return g;
}
let TransposeSpec = class TransposeSpec {
    "test straight"() {
        ///   -----c-----d----
        ///        |     |
        ///        |     |
        ///   -----a-----b----
        let g = asGraph([
            { w: "a", v: "c" },
            { w: "b", v: "d" }
        ]);
        let i = [["c", "d"], ["a", "b"]];
        let e = i.map(i => i.slice(0));
        chai_1.expect(transpose_1.transpose(i, g, "down")).to.deep.eq(e);
    }
    "test simple"() {
        ///   -----c-----d----
        ///        | \ / |
        ///        | / \ |
        ///   -----a-----b----
        let g = asGraph([
            { w: "a", v: "c" },
            { w: "a", v: "d" },
            { w: "b", v: "c" },
            { w: "b", v: "d" }
        ]);
        let i = [["c", "d"], ["a", "b"]];
        let e = i.map(i => i.slice(0));
        i = transpose_1.transpose(i, g, "down");
        i = transpose_1.transpose(i, g, "up");
        chai_1.expect(i).to.deep.eq(i);
    }
    "test 6"() {
        ///   -----d-e-f-g-h--
        ///           / / /
        ///          ////
        ///         //   d e
        ///        /     | |
        ///   -----a-----b-c--
        let g = asGraph([
            { w: "a", v: "f" },
            { w: "a", v: "g" },
            { w: "a", v: "h" },
            { w: "b", v: "d" },
            { w: "c", v: "e" },
        ]);
        let i = [["d", "e", "f", "g", "h"], ["a", "b", "c"]];
        let e = [["d", "e", "f", "g", "h"], ["b", "c", "a"]];
        i = transpose_1.transpose(i, g, "down");
        i = transpose_1.transpose(i, g, "up");
        chai_1.expect(i).to.deep.eq(e);
    }
    "test 7"() {
        ///   -----d-e-f-g-h--
        ///           / / /
        ///          ////
        ///         //   e d
        ///        /     | |
        ///   -----a-----b-c--
        let g = asGraph([
            { w: "a", v: "f" },
            { w: "a", v: "g" },
            { w: "a", v: "h" },
            { w: "b", v: "e" },
            { w: "c", v: "d" },
        ]);
        let i = [["d", "e", "f", "g", "h"], ["a", "b", "c"]];
        let e = [["d", "e", "f", "g", "h"], ["c", "b", "a"]];
        i = transpose_1.transpose(i, g, "down");
        i = transpose_1.transpose(i, g, "up");
        chai_1.expect(i).to.deep.eq(e);
    }
};
__decorate([
    mocha_typescript_1.test
], TransposeSpec.prototype, "test straight", null);
__decorate([
    mocha_typescript_1.test
], TransposeSpec.prototype, "test simple", null);
__decorate([
    mocha_typescript_1.test
], TransposeSpec.prototype, "test 6", null);
__decorate([
    mocha_typescript_1.test
], TransposeSpec.prototype, "test 7", null);
TransposeSpec = __decorate([
    mocha_typescript_1.suite
], TransposeSpec);
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = TransposeSpec;
//# sourceMappingURL=transpose.spec.js.map