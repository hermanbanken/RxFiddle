"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
const median_1 = require("./median");
const chai_1 = require("chai");
const graphlib_1 = require("graphlib");
const mocha_typescript_1 = require("mocha-typescript");
function asGraph(es) {
    let g = new graphlib_1.Graph();
    es.forEach(({ v, w }) => g.setEdge(v, w));
    return g;
}
let MedianSpec = class MedianSpec {
    "test median n = 5"() {
        chai_1.expect(median_1.median([1, 2, 3, 4, 5])).to.eq(3);
    }
    "test median n = 4"() {
        chai_1.expect(median_1.median([1, 2, 4, 5])).to.eq(4);
    }
    "test median n = 2"() {
        chai_1.expect(median_1.median([2, 5])).to.eq(3.5);
    }
    "test median n = 1"() {
        chai_1.expect(median_1.median([3])).to.eq(3);
    }
    "test straight"() {
        ///   -----c-----d----
        ///        |     |
        ///        |     |
        ///   -----a-----b----
        let g = asGraph([
            { v: "c", w: "a" },
            { v: "d", w: "b" },
        ]);
        let i = [["c", "d"], ["a", "b"]];
        let e = i.map(ii => ii.slice(0));
        median_1.wmedian(i, g, "down");
        chai_1.expect(i).to.deep.eq(e);
    }
    "test disconnected"() {
        ///   -----a-----b----
        ///        |     |
        ///   -----c-----d----
        ///        |     x
        ///   -----e-----f----
        ///        |     |
        ///   -----g-----h----
        let g = asGraph([
            { v: "a", w: "c" },
            { v: "b", w: "d" },
            { v: "c", w: "e" },
            { v: "e", w: "g" },
            { v: "f", w: "h" },
        ]);
        let i = [["c", "d"], ["e", "f"]];
        let e = i.map(ii => ii.slice(0));
        median_1.wmedian(i, g, "down");
        chai_1.expect(i).to.deep.eq(e);
    }
    "test simple"() {
        ///   -----c-----d----
        ///        | \ / |
        ///        | / \ |
        ///   -----a-----b----
        let g = asGraph([
            { v: "c", w: "a" },
            { v: "d", w: "a" },
            { v: "c", w: "b" },
            { v: "d", w: "b" },
        ]);
        let i = [["c", "d"], ["a", "b"]];
        let e = i.map(ii => ii.slice(0));
        median_1.wmedian(i, g, "down");
        median_1.wmedian(i, g, "up");
        chai_1.expect(i).to.deep.eq(e);
    }
    "test 6"() {
        ///   -----d-e-f-g-h--
        ///           / / /
        ///          ////
        ///         //   d e
        ///        /     | |
        ///   -----a-----b-c--
        let g = asGraph([
            { v: "f", w: "a" },
            { v: "g", w: "a" },
            { v: "h", w: "a" },
            { v: "d", w: "b" },
            { v: "e", w: "c" },
        ]);
        let i = [["d", "e", "f", "g", "h"], ["a", "b", "c"]];
        let e = [["d", "e", "f", "g", "h"], ["b", "c", "a"]];
        median_1.wmedian(i, g, "down");
        median_1.wmedian(i, g, "up");
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
            { v: "f", w: "a" },
            { v: "g", w: "a" },
            { v: "h", w: "a" },
            { v: "e", w: "b" },
            { v: "d", w: "c" },
        ]);
        let i = [["d", "e", "f", "g", "h"], ["a", "b", "c"]];
        let e = [["d", "e", "f", "g", "h"], ["c", "b", "a"]];
        median_1.wmedian(i, g, "down");
        median_1.wmedian(i, g, "up");
        chai_1.expect(i).to.deep.eq(e);
    }
};
__decorate([
    mocha_typescript_1.test
], MedianSpec.prototype, "test median n = 5", null);
__decorate([
    mocha_typescript_1.test
], MedianSpec.prototype, "test median n = 4", null);
__decorate([
    mocha_typescript_1.test
], MedianSpec.prototype, "test median n = 2", null);
__decorate([
    mocha_typescript_1.test
], MedianSpec.prototype, "test median n = 1", null);
__decorate([
    mocha_typescript_1.test
], MedianSpec.prototype, "test straight", null);
__decorate([
    mocha_typescript_1.test
], MedianSpec.prototype, "test disconnected", null);
__decorate([
    mocha_typescript_1.test
], MedianSpec.prototype, "test simple", null);
__decorate([
    mocha_typescript_1.test
], MedianSpec.prototype, "test 6", null);
__decorate([
    mocha_typescript_1.test
], MedianSpec.prototype, "test 7", null);
MedianSpec = __decorate([
    mocha_typescript_1.suite
], MedianSpec);
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = MedianSpec;
//# sourceMappingURL=median.spec.js.map