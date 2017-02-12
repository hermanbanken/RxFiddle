"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
const mocha_typescript_1 = require("mocha-typescript");
let AnimateSpec = class AnimateSpec {
    "expand path"() {
        // vnode.data.attrs.d
        // "M 158.33333333333331 100 C 158.33333333333331 125, 283.3333333333333 125, 283.3333333333333 150 C 283.3333333333333 175, 283.3333333333333 175, 283.3333333333333 200 C 283.3333333333333 225, 283.3333333333333 225, 283.3333333333333 250 C 283.3333333333333 275, 283.3333333333333 275, 283.3333333333333 300 C 283.3333333333333 325, 333.3333333333333 325, 333.3333333333333 350 C 333.3333333333333 375, 408.3333333333333 375,  408.3333333333333 400"
        // oldVNode.data.attrs.d
        // "M 162.5 100 C 162.5 125, 337.5 125, 337.5 150 C 337.5 175, 337.5 175, 337.5 200 C 337.5 225, 337.5 225, 337.5 250 C 337.5 275, 337.5 275, 337.5 300 C 337.5 325, 412.5 325,  412.5 350"
    }
};
__decorate([
    mocha_typescript_1.test
], AnimateSpec.prototype, "expand path", null);
AnimateSpec = __decorate([
    mocha_typescript_1.suite
], AnimateSpec);
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AnimateSpec;
//# sourceMappingURL=animate.spec.js.map