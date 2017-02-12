"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
const morph_1 = require("./morph");
const chai_1 = require("chai");
const mocha_typescript_1 = require("mocha-typescript");
let MorphSpec = class MorphSpec {
    constructor() {
        this.shor = `C 337.5 225, 337.5 225, 337.5 250 
                 C 337.5 275, 337.5 275, 337.5 300 
                 C 337.5 325, 412.5 325, 412.5 350`;
        this.long = `C 337.5 225, 337.5 225, 337.5 250 
                 C 337.5 275, 337.5 275, 337.5 300 
                 C 337.5 325, 412.5 325, 412.5 350 
                 C 412.5 350, 412.5 350, 412.5 350`;
    }
    "parse paths"() {
        chai_1.expect(morph_1.Segment.parsePath("M 10 20")).to.be.deep.equal([
            new morph_1.Segment("M", [10, 20])
        ]);
        chai_1.expect(morph_1.Segment.parsePath("M 10 20 L 30 20")).to.be.deep.equal([
            new morph_1.Segment("M", [10, 20]),
            new morph_1.Segment("L", [30, 20])
        ]);
        chai_1.expect(morph_1.Segment.parsePath("M 10 20, 10 20")).to.be.deep.equal([
            new morph_1.Segment("M", [10, 20, 10, 20])
        ]);
    }
    "M 10 20 + M 15 25"() {
        chai_1.expect(new morph_1.Segment("M", [10, 20]).combine(new morph_1.Segment("M", [15, 25])))
            .to.have.lengthOf(1);
    }
    "M 10 20 15 25 + M 20 30"() {
        chai_1.expect(new morph_1.Segment("M", [10, 20, 15, 25]).combine(new morph_1.Segment("M", [20, 30])))
            .to.have.lengthOf(1);
    }
    "m 5 5 + m 5 5"() {
        chai_1.expect(new morph_1.Segment("m", [5, 5]).combine(new morph_1.Segment("m", [5, 5])))
            .to.have.lengthOf(1);
    }
    "m 5 5 + m 10 5"() {
        chai_1.expect(new morph_1.Segment("m", [5, 5]).combine(new morph_1.Segment("m", [10, 5])))
            .to.have.lengthOf(2);
    }
    "morph +1"() {
        let s1 = morph_1.Path.parse(this.shor);
        let s2 = morph_1.Path.parse(this.long);
        chai_1.expect(s1.expand(1).toString()).to.deep.eq(s2.toString());
        chai_1.expect(s1.expand(1).segments.flatMap(s => s.points)).to.deep.eq(s2.segments.flatMap(s => s.points));
    }
};
__decorate([
    mocha_typescript_1.test
], MorphSpec.prototype, "parse paths", null);
__decorate([
    mocha_typescript_1.test
], MorphSpec.prototype, "M 10 20 + M 15 25", null);
__decorate([
    mocha_typescript_1.test
], MorphSpec.prototype, "M 10 20 15 25 + M 20 30", null);
__decorate([
    mocha_typescript_1.test
], MorphSpec.prototype, "m 5 5 + m 5 5", null);
__decorate([
    mocha_typescript_1.test
], MorphSpec.prototype, "m 5 5 + m 10 5", null);
__decorate([
    mocha_typescript_1.test
], MorphSpec.prototype, "morph +1", null);
MorphSpec = __decorate([
    mocha_typescript_1.suite
], MorphSpec);
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = MorphSpec;
//# sourceMappingURL=morph.spec.js.map