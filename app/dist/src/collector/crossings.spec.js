"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
const chai_1 = require("chai");
const mocha_typescript_1 = require("mocha-typescript");
const crossings_1 = require("./crossings");
let CrossingSpec = class CrossingSpec {
    "test straight"() {
        ///   -----c-----d----
        ///        |     |
        ///        |     |
        ///   -----a-----b----
        let c = crossings_1.crossings(["a", "b"], ["c", "d"], [
            { v: "a", w: "c" },
            { v: "b", w: "d" }
        ]);
        chai_1.expect(c).to.eq(0);
    }
    "test simple"() {
        ///   -----c-----d----
        ///        | \ / |
        ///        | / \ |
        ///   -----a-----b----
        let c = crossings_1.crossings(["a", "b"], ["c", "d"], [
            { v: "a", w: "c" },
            { v: "a", w: "d" },
            { v: "b", w: "c" },
            { v: "b", w: "d" }
        ]);
        chai_1.expect(c).to.eq(1);
    }
    "test 6"() {
        ///   -----d-e-f-g-h--
        ///           / / /
        ///          ////
        ///         //   d e
        ///        /     | |
        ///   -----a-----b-c--
        let c = crossings_1.crossings(["a", "b", "c"], ["d", "e", "f", "g", "h"], [
            { v: "a", w: "f" },
            { v: "a", w: "g" },
            { v: "a", w: "h" },
            { v: "b", w: "d" },
            { v: "c", w: "e" },
        ]);
        chai_1.expect(c).to.eq(6);
    }
    "test 7"() {
        ///   -----d-e-f-g-h--
        ///           / / /
        ///          ////
        ///         //   e d
        ///        /     | |
        ///   -----a-----b-c--
        let c = crossings_1.crossings(["a", "b", "c"], ["d", "e", "f", "g", "h"], [
            { v: "a", w: "f" },
            { v: "a", w: "g" },
            { v: "a", w: "h" },
            { v: "b", w: "e" },
            { v: "c", w: "d" },
        ]);
        chai_1.expect(c).to.eq(7);
    }
};
__decorate([
    mocha_typescript_1.test
], CrossingSpec.prototype, "test straight", null);
__decorate([
    mocha_typescript_1.test
], CrossingSpec.prototype, "test simple", null);
__decorate([
    mocha_typescript_1.test
], CrossingSpec.prototype, "test 6", null);
__decorate([
    mocha_typescript_1.test
], CrossingSpec.prototype, "test 7", null);
CrossingSpec = __decorate([
    mocha_typescript_1.suite
], CrossingSpec);
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = CrossingSpec;
//# sourceMappingURL=crossings.spec.js.map