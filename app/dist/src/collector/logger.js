"use strict";
const callrecord_1 = require("./callrecord");
const event_1 = require("./event");
const lens_1 = require("./lens");
const Rx = require("rx");
const ErrorStackParser = require("error-stack-parser");
function isStream(v) {
    return v instanceof Rx.Observable;
}
function instanceAddSubscription(input) {
    return typeof input !== "undefined" && "observableId" in input && "id" in input;
}
exports.instanceAddSubscription = instanceAddSubscription;
function guessing(value, ...args) {
    console.warn("Guessed", value, ".", ...args);
    return value;
}
function ascend(obj) {
    let objs = Array.isArray(obj) ? obj : [obj];
    let items = objs.filter(o => o)
        .map(_ => Object.keys(_).map(key => _[key]))
        .reduce((list, n) => list.concat(n, []), []);
    return {
        items,
        ascend: () => ascend(items),
    };
}
function ascendingFind(target, test, maxLevel = 10) {
    if (test(target)) {
        return target;
    }
    let result = ascend(target);
    let level = 0;
    do {
        let finding = result.items.find(test);
        if (typeof finding !== "undefined") {
            return finding;
        }
        result = result.ascend();
        level++;
    } while (level < maxLevel);
}
class AddStackFrame {
}
exports.AddStackFrame = AddStackFrame;
class AddObservable {
    inspect(depth, opts) {
        return `AddObservable(${this.method || this.constructor.name}, id: ${this.id})`;
    }
    toString() {
        return this.inspect(0);
    }
}
exports.AddObservable = AddObservable;
class AddSubscriptionImpl {
}
class AddEvent {
}
exports.AddEvent = AddEvent;
class Collector {
    constructor() {
        this.indices = {
            observables: {},
            stackframes: {},
            subscriptions: {},
        };
        this.data = [];
        this.queue = [];
        this.collectorId = Collector.collectorId++;
        this.hash = this.collectorId ? `__hash${this.collectorId}` : "__hash";
    }
    static reset() {
        this.collectorId = 0;
    }
    lens() {
        return lens_1.lens(this);
    }
    before(record, parents) {
        this.queue.push(record);
        return this;
    }
    after(record) {
        // Trampoline
        if (this.queue[0] === record) {
            this.queue.shift();
        }
        else if (this.queue.length > 0) {
            return;
        }
        switch (callrecord_1.callRecordType(record)) {
            case "setup": {
                this.observable(record.returned, record);
                break;
            }
            case "subscribe":
                {
                    let sinkSubscriber = ascendingFind(record.arguments[0], (o) => {
                        return this.getSubscription(this.id(o).get()) && true || false;
                    });
                    new Array(record.returned).filter(o => typeof o === "object").forEach((observer) => {
                        // Add higher order links, recording upstream nested 
                        // observables (eg flatMap's inner FlatMapObservable)
                        let scopeId = undefined;
                        if (record.subject.isScoped) {
                            let found = ascendingFind(record.arguments[0], (o) => {
                                return this.observableForObserver(o) && true;
                            });
                            scopeId = this.id(found).get();
                        }
                        if (observer && record.subject) {
                            // log subscribe
                            let subid = this.subscription(observer, record.subject, scopeId, sinkSubscriber);
                            // indices
                            if (typeof scopeId !== "undefined") {
                                this.indices.subscriptions[scopeId].scoping.push(subid);
                            }
                        }
                    });
                }
                break;
            case "event":
                let sid = this.id(record.subject).get();
                let event = event_1.Event.fromRecord(record);
                if (event && event.type === "subscribe" || typeof event === "undefined") {
                    return;
                }
                if (typeof sid !== "undefined") {
                    let node = new AddEvent();
                    node.event = event;
                    node.subscription = sid;
                    this.data.push(node);
                    let index = this.indices.subscriptions[sid];
                    if (typeof index === "undefined") {
                        index = this.indices.subscriptions[sid] = { events: [], scoping: [] };
                    }
                    index.events.push(this.data.length - 1);
                }
                else {
                    if (record.method === "dispose") {
                    }
                }
                break;
            default:
                throw new Error("unreachable");
        }
        // Run trampoline
        if (this.queue.length) {
            this.queue.splice(0, this.queue.length).forEach(this.after.bind(this));
        }
    }
    get length() {
        return this.data.length;
    }
    getLog(id) {
        return this.data[id];
    }
    getObservable(id) {
        let node = this.data[id];
        if (node instanceof AddObservable) {
            return node;
        }
    }
    getSubscription(id) {
        let node = this.data[id];
        if (instanceAddSubscription(node)) {
            return node;
        }
    }
    getStack(id) {
        let node = this.data[id];
        if (node instanceof AddStackFrame) {
            return node;
        }
    }
    getEvent(id) {
        let node = this.data[id];
        if (node instanceof AddEvent) {
            return node;
        }
    }
    wrapHigherOrder(subject, fn) {
        let self = this;
        if (typeof fn === "function") {
            return function wrapper(val, id, subjectSuspect) {
                let result = fn.apply(this, arguments);
                if (typeof result === "object" && isStream(result) && subjectSuspect) {
                    return self.proxy(result);
                }
                return result;
            };
        }
        return fn;
    }
    pretty(o) {
        let id = this.id(o).get();
        if (typeof id !== "undefined") {
            let node = this.data[id];
            if (instanceAddSubscription(node)) {
                let obs = this.getObservable(node.observableId);
                return `${o.constructor.name}(${id}, observable: ${obs})`;
            }
            if (node instanceof AddEvent) {
                let oid = this.getSubscription(node.subscription).observableId;
                return `${node.event.type}(subscription: ${node.subscription}, observable: ${oid})`;
            }
            if (node instanceof AddObservable) {
                return `${o.constructor.name}(${id})`;
            }
        }
        return `anonymous ${o.constructor.name}`;
    }
    proxy(target) {
        return new Proxy(target, {
            get: (obj, name) => {
                if (name === "isScoped") {
                    return true;
                }
                return obj[name];
            },
        });
    }
    stackFrame(record) {
        if (typeof record === "undefined" || typeof record.stack === "undefined") {
            return undefined;
        }
        // Code Location
        let stack = ErrorStackParser.parse(record).slice(1, 2)[0];
        let id = this.indices.stackframes[stack];
        if (typeof id === "undefined") {
            this.indices.stackframes[stack] = id = this.data.length;
            let node = new AddStackFrame();
            node.id = id;
            node.stackframe = stack;
            this.data.push(node);
        }
        return id;
    }
    observableForObserver(observer) {
        let id = this.id(observer).get();
        if (typeof id === "undefined") {
            return;
        }
        let node = this.getSubscription(id);
        let obs = node && this.getObservable(node.observableId) || undefined;
        return obs;
    }
    enrichWithCall(node, record, observable) {
        if (typeof node.method !== "undefined") {
            return;
        }
        node.stack = this.stackFrame(record);
        node.arguments = record && record.arguments;
        node.method = record && record.method || observable.constructor.name;
        // Add call-parent
        if (record && record.parent && record.subject === record.parent.subject) {
            node.callParent = this.id(record.parent.returned).get();
        }
        let parents = [record && record.subject].concat(record && record.arguments)
            .filter(isStream)
            .map((arg) => this.observable(arg));
        node.parents = parents;
        this.indices.observables[node.id] = { childs: [], inner: [], subscriptions: [] };
        parents.forEach(parent => {
            let index = this.indices.observables[parent];
            if (typeof index !== "undefined") {
                index.childs.push(node.id);
            }
        });
    }
    observable(obs, record) {
        let existingId = this.id(obs).get();
        if (typeof record !== "undefined" &&
            typeof existingId !== "undefined" &&
            typeof this.data[existingId] !== "undefined") {
            this.enrichWithCall(this.getObservable(existingId), record, obs);
        }
        // ensure all dependencies are tagged
        [record && record.subject].concat(record && record.arguments)
            .filter(isStream)
            .map((arg) => this.observable(arg));
        return (this.id(obs).getOrSet(() => {
            // if (typeof record !== "undefined") {
            let node = new AddObservable();
            node.id = this.data.length;
            node.parents = [];
            this.data.push(node);
            this.enrichWithCall(node, record, obs);
            return node.id;
            // }
        }));
    }
    /**
     * AnonymousObservable uses AnonymousObserver to subscribe, which does not list its sinks.
     * We can guess though, that the previously created observer is the sink
     */
    heuristicallyGetSinkSubscribers() {
        if (this.getSubscription(this.data.length - 1)) {
            return [guessing(this.data.length - 1, "No sink Observer found, using previous Observer as most probable sink.")];
        }
        return [];
    }
    subscription(sub, observable, scopeId, sink) {
        let obsId = this.observable(observable);
        let create = (id) => {
            let sinks = sink ? [this.id(sink).get()] : this.heuristicallyGetSinkSubscribers();
            let node = new AddSubscriptionImpl();
            this.data.push(node);
            node.id = id;
            node.sinks = sinks;
            node.observableId = obsId;
            if (typeof scopeId !== "undefined") {
                node.scopeId = scopeId;
            }
            this.indices.subscriptions[id] = { events: [], scoping: [] };
            let index = this.indices.observables[node.observableId];
            if (typeof index !== "undefined") {
                index.subscriptions.push(id);
            }
        };
        // if (typeof (<any>observable).onNext !== "undefined") {
        //   console.warn("subject!!!", sub, observable)
        // }
        // let maybeSubject: AddObservable = this.getObservable(this.id(sub).get())
        // if (typeof maybeSubject !== "undefined") {
        //   console.warn("subject!!!")
        //   let id = this.id(sub).get()
        //   let node = create(id)
        //   Object.assign(this.data[id], node)
        //   return this.id(sub).get()
        // }
        return this.id(sub).getOrSet(() => {
            let id = this.data.length;
            create(id);
            return id;
        });
    }
    id(obs) {
        return {
            get: () => typeof obs !== "undefined" && obs !== null ? obs[this.hash] : undefined,
            getOrSet: (orSet) => {
                if (typeof obs[this.hash] === "undefined") {
                    obs[this.hash] = orSet();
                }
                return obs[this.hash];
            },
            set: (n) => obs[this.hash] = n,
        };
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Collector;
Collector.collectorId = 0;
//# sourceMappingURL=logger.js.map