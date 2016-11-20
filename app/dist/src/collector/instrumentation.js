"use strict";
require("../utils");
const visualizer_1 = require("./visualizer");
const Rx = require("rx");
const rxAny = Rx;
exports.defaultSubjects = {
    Observable: Rx.Observable,
    "Observable.prototype": rxAny.Observable.prototype,
    "ObservableBase.prototype": rxAny.ObservableBase.prototype,
    "AbstractObserver.prototype": rxAny.internals.AbstractObserver.prototype,
    "AnonymousObserver.prototype": rxAny.AnonymousObserver.prototype,
    "Subject.prototype": rxAny.Subject.prototype,
};
function now() {
    return typeof performance !== "undefined" ? performance.now() : new Date().getTime();
}
function hasRxPrototype(input) {
    return typeof input === "object" && (rxAny.Observable.prototype.isPrototypeOf(input) ||
        rxAny.internals.AbstractObserver.prototype.isPrototypeOf(input));
}
function startsWith(input, matcher) {
    let r = input.substr(0, matcher.length) === matcher;
    return r;
}
function detachedScopeProxy(input) {
    let hashes = {};
    if (input.__detached === true) {
        return input;
    }
    return new Proxy(input, {
        get: (target, property) => {
            if (property === "__detached") {
                return true;
            }
            if (typeof property === "string" && startsWith(property, "__hash")) {
                return hashes[property];
            }
            return target[property];
        },
        set: (target, property, value) => {
            if (typeof property === "string" && startsWith(property, "__hash")) {
                hashes[property] = value;
            }
            return true;
        },
    });
}
/**
 * Tweaks specific for RxJS 4
 */
function rxTweaks(call) {
    // Detach reuse of NeverObservable
    let fields = [];
    fields.push([call, "subject"], [call, "returned"]);
    fields.push(...[].map.call(call.arguments, (a, i) => [call.arguments, i]));
    fields.forEach(([subject, prop]) => {
        if (typeof subject[prop] !== "undefined" && subject[prop] !== null &&
            subject[prop].constructor.name === "NeverObservable") {
            subject[prop] = detachedScopeProxy(subject[prop]);
        }
    });
    // Other tweaks here...
}
let i = 0;
class Instrumentation {
    constructor(subjects = exports.defaultSubjects, logger) {
        this.open = [];
        this.stackTraces = true;
        this.calls = [];
        this.prototypes = [];
        this.subjects = subjects;
        this.logger = logger;
        Object.keys(subjects).slice(0, 1).forEach((s) => subjects[s][visualizer_1.IGNORE] = true);
    }
    /* tslint:disable:only-arrow-functions */
    /* tslint:disable:no-string-literal */
    /* tslint:disable:no-string-literal */
    instrument(fn, extras) {
        let calls = this.calls;
        let logger = this.logger;
        let open = this.open;
        let self = this;
        let instrumented = new Proxy(fn, {
            apply: (target, thisArg, argumentsList) => {
                // console.log(target.caller)
                // find more
                argumentsList
                    .filter(hasRxPrototype)
                    .filter((v) => !v.hasOwnProperty("__instrumented"))
                    .forEach((t) => this.setupPrototype(t));
                let call = {
                    arguments: [].slice.call(argumentsList, 0),
                    childs: [],
                    id: i++,
                    method: extras["methodName"],
                    returned: null,
                    stack: self.stackTraces ? new Error().stack : undefined,
                    subject: thisArg,
                    subjectName: extras["subjectName"],
                    time: now(),
                };
                // Prepare
                calls.push(call);
                if (open.length > 0) {
                    call.parent = open[open.length - 1];
                    call.parent.childs.push(call);
                }
                open.push(call);
                // Nicen up Rx performance tweaks
                rxTweaks(call);
                // Actual method
                let instanceLogger = logger.before(call, open.slice(0, -1));
                let returned = target.apply(call.subject, [].map.call(argumentsList, instanceLogger.wrapHigherOrder.bind(instanceLogger, call.subject)));
                call.returned = returned;
                // Nicen up Rx performance tweaks
                rxTweaks(call);
                instanceLogger.after(call);
                // find more
                new Array(call.returned)
                    .filter(hasRxPrototype)
                    .filter((v) => !v.hasOwnProperty("__instrumented"))
                    .forEach((t) => this.setupPrototype(t));
                // Cleanup
                open.pop();
                return call.returned;
            },
            construct: (target, args) => {
                console.warn("TODO, instrument constructor", target, args);
                return new target(...args);
            },
        });
        instrumented.__originalFunction = fn;
        return instrumented;
    }
    deinstrument(fn) {
        return fn.__originalFunction || fn;
    }
    /* tslint:enable:only-arrow-functions */
    /* tslint:enable:no-string-literal */
    /* tslint:enable:no-string-literal */
    setup() {
        Object.keys(this.subjects)
            .forEach(name => this.setupPrototype(this.subjects[name], name));
        rxAny.Subject = this.instrument(rxAny.Subject, {
            methodName: "new",
            subjectName: "Rx.Subject",
        });
    }
    setupPrototype(prototype, name) {
        if (typeof name !== "undefined") {
            prototype.__dynamicallyInstrumented = true;
        }
        let methods = Object.keys(prototype)
            .filter((key) => typeof prototype[key] === "function");
        // log, preparing for teardown
        this.prototypes.push(prototype);
        methods.forEach(key => {
            prototype[key].__instrumented = true;
            prototype[key] = this.instrument(prototype[key], {
                methodName: key,
                subjectName: name || prototype.constructor.name,
            });
        });
    }
    teardown() {
        rxAny.Subject = this.deinstrument(rxAny.Subject);
        let properties = this.prototypes
            .map(subject => Object.keys(subject).map(key => ({ key, subject })))
            .reduce((prev, next) => prev.concat(next), []);
        let methods = properties
            .filter(({ key, subject }) => typeof subject[key] === "function");
        methods.forEach(({ key, subject }) => {
            subject[key] = this.deinstrument(subject[key]);
            delete subject.__instrumented;
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Instrumentation;
//# sourceMappingURL=instrumentation.js.map