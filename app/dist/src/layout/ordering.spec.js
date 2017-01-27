"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
const ordering_1 = require("./ordering");
// import { assert, expect, use as chaiUse } from "chai"
const graphlib_1 = require("graphlib");
const mocha_typescript_1 = require("mocha-typescript");
let OrdeningSpec = class OrdeningSpec {
    "test median n = 5"() {
        // expect(median([1,2,3,4,5])).to.eq(3)
        ordering_1.ordering([], new graphlib_1.Graph());
    }
};
__decorate([
    mocha_typescript_1.test
], OrdeningSpec.prototype, "test median n = 5", null);
OrdeningSpec = __decorate([
    mocha_typescript_1.suite
], OrdeningSpec);
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = OrdeningSpec;
//# sourceMappingURL=ordering.spec.js.map