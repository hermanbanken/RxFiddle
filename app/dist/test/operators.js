"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
const lens_1 = require("../src/collector/lens");
const instrumentationTest_1 = require("./instrumentationTest");
const chai_1 = require("chai");
const mocha_typescript_1 = require("mocha-typescript");
const Rx = require("rx");
const typedgraph_1 = require("../src/collector/typedgraph");
let rxProto = Rx.Observable.prototype;
class TestObserver {
    constructor() {
        this.nexts = [];
        this.error = null;
        this.completed = false;
        this.events = [];
    }
    onNext(value) {
        this.nexts.push(value);
        this.events.push({ time: new Date(), value });
    }
    onError(exception) {
        this.error = exception;
        this.events.push({ time: new Date(), exception });
    }
    onCompleted() {
        let completed = this.completed = true;
        this.events.push({ time: new Date(), completed });
    }
    makeSafe(disposable) {
        return this;
    }
    dispose() {
        let disposed = true;
        this.events.push({ time: new Date(), disposed });
    }
}
function jsonify(obj) {
    let cache = [];
    let json = JSON.stringify(obj, (key, value) => {
        if (typeof value === "string" && key === "stack") {
            return value.split("\\n")[0];
        }
        if (typeof value === "object" && key === "parent" && "id" in value) {
            return value.id;
        }
        if (typeof value === "object" && key === "childs") {
            return "muted";
        }
        if (typeof value === "object" && value !== null) {
            if (cache.indexOf(value) !== -1) {
                // Circular reference found, discard key
                if (typeof value === "object") {
                    value = Object.keys(value)
                        .filter(k => value.hasOwnProperty(k))
                        .map(k => value[k])
                        .filter(c => typeof c !== "object");
                    return "[Circular " + jsonify(value) + "]";
                }
                return "[Circular " + value.toString() + "]";
            }
            // Store value in our collection
            cache.push(value);
        }
        return value;
    }, "  ");
    cache = null; // Enable garbage collection
    return json;
}
function complexObs() {
    let A = Rx.Observable.of(1, 2, 3)
        .map(i => "hello " + i)
        .filter(_ => true)
        .map(_ => _)
        .skip(1)
        .share();
    A.flatMapLatest(s => Rx.Observable.of("postfix").startWith(s))
        .groupBy(s => s[s.length - 1])
        .map(o => o.startWith("group of " + o.key))
        .mergeAll()
        .subscribe();
}
let OperatorTest = class OperatorTest extends instrumentationTest_1.InstrumentationTest {
    // @test
    "test coverage"() {
        let tested = [
            "map",
        ];
        let untested = Object.keys(rxProto).filter(method => tested.indexOf(method) < 0);
        if (untested.length !== 0) {
            throw new Error("Untested methods: " + untested.length);
        }
    }
    // @test
    "map"() {
        Rx.Observable.of(0, 1, 2)
            .map(i => String.fromCharCode("a".charCodeAt(0) + i))
            .subscribe();
        let lens = lens_1.lens(this.rxcollector).find("map");
        chai_1.expect(lens.all()).to.have.lengthOf(1);
        let subs = lens.subscriptions().all();
        chai_1.expect(subs).to.have.lengthOf(1);
        chai_1.expect(lens.subscriptions().nexts().map(_ => _.value)).to.deep.eq(["a", "b", "c"]);
        chai_1.expect(lens.subscriptions().completes()).to.have.lengthOf(1);
    }
    // @test
    "filter"() {
        if (this.ensureCollector(this.collector)) {
            Rx.Observable.of(1, 2, 3)
                .filter(i => i < 2)
                .subscribe();
            let lens = lens_1.lens(this.collector).find("filter");
            chai_1.expect(lens.all()).to.have.lengthOf(1);
            let subs = lens.subscriptions().all();
            chai_1.expect(subs).to.have.lengthOf(1);
            chai_1.expect(lens.subscriptions().nexts().map(_ => _.value)).to.deep.eq([1]);
            chai_1.expect(lens.subscriptions().completes()).to.have.lengthOf(1);
        }
    }
    // @test
    "complex"() {
        if (this.ensureCollector(this.collector)) {
            console.time("complex instrumented");
            complexObs();
            console.timeEnd("complex instrumented");
            let lens = lens_1.lens(this.collector).find("mergeAll");
            chai_1.expect(lens.all()).to.have.lengthOf(1);
            let subs = lens.subscriptions().all();
            chai_1.expect(subs).to.have.lengthOf(1);
            chai_1.expect(lens.subscriptions().nexts().map(_ => _.value)).to.deep.eq([
                "group of 2",
                "hello 2",
                "group of x",
                "postfix",
                "group of 3",
                "hello 3",
                "postfix",
            ]);
            chai_1.expect(lens.subscriptions().completes()).to.have.lengthOf(1);
        }
    }
    // @test
    "complexTiming"() {
        this.instrumentation.teardown();
        console.time("complex");
        complexObs();
        console.timeEnd("complex");
    }
    // @test
    "nested-call operators"() {
        // Rx.Observable.of(1, 2, 3)
        //   .share()
        //   .subscribe()
        // console.log("")
        // console.log("")
        // console.log("START")
        complexObs();
        // let obs = Rx.Observable.of(1, 2, 3)
        //   .doOnNext(v => { return })
        //   .flatMap(v => { console.log("Running"); return Rx.Observable.just(v).map(id => id) })
        // obs.subscribe(new TestObserver<number>())
        // console.log("END")
        // console.log(this.newcollector.observerStorage.sets)
        // console.log("")
        // console.log("")
        let fs = require("fs");
        let t2 = new typedgraph_1.default();
        this.newcollector.messages
            .flatMap(v => v.type === "edge" ? [v.edge] : [])
            .forEach(e => t2.setEdge(e.v.toString(), e.w.toString(), e.label));
        // console.log("DOT messages", t2.toDot())
        // console.log("")
        // console.log("")
        // console.log("ALL MESSAGES to messages.json")
        fs.writeFileSync("messages.json", jsonify(this.newcollector.messages));
        // console.log("ALL TRACE to trace.json")
        // fs.writeFileSync("trace.json", jsonify(this.newcollector.trace))
        // console.log("ALL DATA to data.json")
        // fs.writeFileSync("data.json", jsonify(this.rxcollector.data.filter(v => !("stackframe" in v))))
        // console.log("")
        // console.log("")
        chai_1.expect(this.rxcollector.lens().roots().all()).to.deep.eq([{
                arguments: [1, 2, 3],
                id: 0,
                method: "of",
                parents: [],
                stack: 2,
            }]);
        let childs = this.rxcollector.lens().roots().childs();
        chai_1.expect(childs.all()).to.deep.eq([{
                arguments: [],
                id: 1,
                method: "share",
                parents: [0],
                stack: undefined,
            }]);
        chai_1.expect(childs.internals().all())
            .to.have.length.greaterThan(0);
    }
    // @test
    "higher order operators"() {
        Rx.Observable.of(1, 2, 3)
            .flatMap(i => Rx.Observable.empty())
            .subscribe();
        let lens = this.rxcollector.lens();
        chai_1.expect(lens.all().all().map(_ => _.method || _)).to.deep.equal([
            "of", "flatMap", "empty",
        ]);
        let flatMapSubId = lens.find("flatMap").subscriptions().all()[0].id;
        chai_1.expect(lens.find("empty").subscriptions().all().map(_ => _.scopeId)).to.deep.equal([flatMapSubId, flatMapSubId, flatMapSubId]);
        chai_1.expect(lens.find("flatMap").subscriptions().scoping().all()).to.have.lengthOf(3);
    }
    // @test
    "mixed higher order operators"() {
        let inner = Rx.Observable.fromArray(["a"]);
        inner.subscribe();
        Rx.Observable.of(1, 2, 3)
            .flatMap(i => inner)
            .subscribe();
        let lens = this.rxcollector.lens();
        let roots = lens.roots();
        let childs = roots.childs();
        chai_1.expect(roots.all().map(_ => _.method || _)).to.deep.equal(["fromArray", "of"]);
        chai_1.expect(childs.all().map(_ => _.method || _)).to.deep.equal(["flatMap"]);
        let flatMapSubId = lens.find("flatMap").subscriptions().all()[0].id;
        chai_1.expect(lens.find("fromArray").subscriptions().all().map(_ => _.scopeId)).to.deep.equal([undefined, flatMapSubId, flatMapSubId, flatMapSubId]);
        chai_1.expect(lens.find("flatMap").subscriptions().scoping().all()).to.have.lengthOf(3);
    }
    // @test
    "performance operators"() {
        Rx.Observable.of(1, 2, 3)
            .map(s => s)
            .map(o => o)
            .subscribe();
        let lens = this.rxcollector.lens();
        chai_1.expect(lens.find("map").all().map(_ => _.method)).to.deep.equal(["map", "map"]);
        // Map combines subsequent maps: the first operator will never receive subscribes
        lens.find("map").each().forEach((mapLens, i) => {
            chai_1.expect(mapLens.subscriptions().all()).to.have.lengthOf(i === 0 ? 0 : 1);
        });
    }
};
OperatorTest = __decorate([
    mocha_typescript_1.suite
], OperatorTest);
exports.OperatorTest = OperatorTest;
//# sourceMappingURL=operators.js.map