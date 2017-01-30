"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
const instrumentation_1 = require("../src/collector/instrumentation");
const logger_1 = require("../src/collector/logger");
const mocha_typescript_1 = require("mocha-typescript");
let InstrumentationTest = class InstrumentationTest {
    before() {
        // Collector.reset()
        // this.collector = new Collector()
        // this.instrumentation = new Instrumentation(defaultSubjects, this.collector)
        // this.instrumentation.setup()
        this.collector = new logger_1.NewCollector();
        this.instrumentation = new instrumentation_1.default(instrumentation_1.defaultSubjects, this.collector);
        this.instrumentation.setup();
    }
    after() {
        this.instrumentation.teardown();
    }
    ensureCollector(arg) {
        if (this instanceof logger_1.default) {
            return true;
        }
        else {
            return false;
        }
    }
    rxCheck() {
        if (!this.ensureCollector(this.collector)) {
            throw new Error("RxCollector is no Collector");
        }
    }
    get rxcollector() {
        return this.collector;
    }
    get newcollector() {
        return this.collector;
    }
};
InstrumentationTest = __decorate([
    mocha_typescript_1.suite
], InstrumentationTest);
exports.InstrumentationTest = InstrumentationTest;
//# sourceMappingURL=instrumentationTest.js.map