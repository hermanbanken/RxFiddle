"use strict";
const callrecord_1 = require("./callrecord");
const event_1 = require("./event");
const lens_1 = require("./lens");
const Rx = require("rx");
const ErrorStackParser = require("error-stack-parser");
function isStream(v) {
    return v instanceof Rx.Observable;
}
function isSubscription(v) {
    return typeof v === "object" && v !== null && typeof v.dispose === "function";
}
function isObservable(v) {
    return typeof v === "object" && v !== null && typeof v.subscribe === "function";
}
function formatArguments(args) {
    return [].map.call(args, (a) => {
        switch (typeof a) {
            case "undefined": return "undefined";
            case "object":
                if (Array.isArray(a)) {
                    return `[${formatArguments(a)}]`;
                }
                else {
                    return a.toString() === "[object Object]" ? `[object ${a.constructor.name}]` : a;
                }
            case "function":
                if (typeof a.__original === "function") {
                    return a.__original.toString();
                }
                return a.toString();
            case "string":
                return a.substring(0, 512);
            case "number":
                return a;
            default: throw new TypeError(`Invalid type ${typeof a}`);
        }
    }).join(", ");
}
exports.formatArguments = formatArguments;
function last(list) {
    return list.length >= 1 ? list[list.length - 1] : undefined;
}
function head(list) {
    return list.length >= 1 ? list[0] : undefined;
}
function elvis(item, path) {
    let next = typeof item === "object" && path.length && path[0] in item ? item[path[0]] : undefined;
    if (path.length > 1) {
        return elvis(next, path.slice(1));
    }
    else if (typeof next !== "undefined") {
        return [next];
    }
    else {
        return [];
    }
}
function keys(obj) {
    return Object.keys(obj);
}
function numkeys(obj) {
    return Object.keys(obj)
        .map(v => typeof v === "number" ? v : parseInt(v, 10))
        .filter(v => !isNaN(v));
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
class AddStructureEntry {
}
exports.AddStructureEntry = AddStructureEntry;
class AddObservable {
    inspect(depth, opts) {
        return `AddObservable(${this.method || this.constructor.name}, id: ${this.id}, parents: [${this.parents}])`;
    }
    toString() {
        return this.inspect(0);
    }
}
exports.AddObservable = AddObservable;
class AddSubscriptionImpl {
    inspect(depth, opts) {
        return `AddSubscription(${this.id}, 
      observable: ${this.observableId}, sinks: [${this.sinks}], scope: ${this.scopeId})`;
    }
    toString() {
        return this.inspect(0);
    }
}
exports.AddSubscriptionImpl = AddSubscriptionImpl;
class AddEvent {
}
exports.AddEvent = AddEvent;
class ObserverSet {
    constructor(observable) {
        this.ids = [];
        this.relations = [];
        this.tags = {};
        this.observable = observable;
    }
    inspect(depth, opts) {
        let ts = depth > 0 ? numkeys(this.tags).map(v => {
            return this.tags[v] ? `\n\t${v}: ${this.tags[v].join(",")}` : v;
        }) : "[..]";
        return `ObservableSet(o: ${this.observable}, [${this.ids}], ${ts})`;
    }
    toString() {
        return this.inspect(1);
    }
}
exports.ObserverSet = ObserverSet;
class ObserverStorage {
    constructor() {
        this.sets = [];
        this.observableToSets = {};
        this.observerToSet = {};
        this.observerToObservable = {};
    }
    set(forObservable, forObserver) {
        let set;
        let setId;
        if (typeof this.observerToSet[forObserver] !== "undefined") {
            setId = this.observerToSet[forObserver];
            set = this.sets[setId];
        }
        else {
            set = new ObserverSet(forObservable);
            this.observableToSets[forObservable] = (this.observableToSets[forObservable] || []).concat([set]);
            setId = this.sets.push(set) - 1;
        }
        function addTag(observer, tag) {
            if (typeof set.tags[observer] === "undefined") {
                set.tags[observer] = [];
            }
            if (set.tags[observer].indexOf(tag) < 0) {
                set.tags[observer].push(tag);
            }
        }
        return {
            addCore: (observer, ...tags) => {
                if (set.ids.indexOf(observer) < 0) {
                    set.ids.push(observer);
                }
                tags.forEach(t => addTag(observer, t));
                this.observerToSet[observer] = setId;
                this.observerToObservable[observer] = forObservable;
            },
            addRelation: (observer, ...tags) => {
                if (set.relations.indexOf(observer) < 0) {
                    set.relations.push(observer);
                }
                tags.forEach(t => addTag(observer, t));
            },
        };
    }
}
exports.ObserverStorage = ObserverStorage;
function existsSomewhereIn(obj, search) {
    let searched = [];
    let depth = 0;
    let toBeSearched = keys(obj).map(key => ({ key, value: obj[key] }));
    while (toBeSearched.length && depth++ < 3) {
        let found = toBeSearched.find(v => search.indexOf(v.value) >= 0);
        if (found) {
            return found.key;
        }
        searched.push(...toBeSearched.map(pair => pair.value));
        toBeSearched = toBeSearched
            .filter(pair => typeof pair.value === "object" && pair.value !== null)
            .flatMap(p => keys(p.value).map(k => ({ key: p.key + "." + k, value: p.value[k] })))
            .filter(pair => searched.indexOf(pair.value) < 0);
    }
    return;
}
class NewCollector {
    constructor() {
        this.collectorId = Collector.collectorId++;
        this.messages = [];
        this.observerStorage = new ObserverStorage();
        this.groups = [];
        this.groupId = 0;
        this.collectorId = Collector.collectorId++;
        this.hash = this.collectorId ? `__hash${this.collectorId}` : "__hash";
    }
    observerToObs(observer) {
        let oid = typeof observer === "number" ? observer : this.id(observer).get();
        return this.observerStorage.observerToObservable[oid];
    }
    before(record, parents) {
        this.tags(record.subject, ...record.arguments);
        switch (callrecord_1.callRecordType(record)) {
            case "setup":
                // Track group entry
                this.groups.slice(-1).forEach(g => g.used = true);
                this.groups.push({ call: record, id: this.groupId++, used: false });
                break;
            case "subscribe":
                [].filter.call(record.arguments, isSubscription)
                    .forEach((sub) => {
                    let set = this.observerStorage.set(this.id(record.subject).get(), this.id(sub).get());
                    set.addCore(this.id(sub).get(), "1");
                    // Add subscription label
                    this.messages.push({
                        label: {
                            id: this.id(sub).get(),
                            type: "subscription",
                        },
                        node: this.id(record.subject).get(),
                        type: "label",
                    });
                    // Find higher order sink:
                    // see if this sub has higher order sinks
                    // TODO verify robustness of .parent & add other patterns
                    if (sub.parent) {
                        set.addRelation(this.id(sub.parent).get(), "3 higher sink");
                        let parentObs = this.observerToObs(sub.parent);
                        // Add subscription link
                        this.messages.push({
                            edge: {
                                label: {
                                    id: this.id(sub).get(),
                                    parent: this.id(sub.parent).get(),
                                    type: "higherOrderSubscription sink",
                                },
                                v: this.id(record.subject).get(),
                                w: parentObs,
                            },
                            id: this.messages.length,
                            type: "edge",
                        });
                    }
                    // Find sink:
                    // see if this sub links to record.parent.arguments.0 => link
                    if (record.parent) {
                        let ps = [].filter.call(record.parent.arguments, isSubscription);
                        let key = existsSomewhereIn(sub, ps);
                        if (key) {
                            let sinks = elvis(sub, key.split("."));
                            // console.log(
                            //   record.subject.constructor.name, "-|>",
                            //   sinks.map(v => v.constructor.name))
                            sinks.forEach(sink => {
                                set.addRelation(this.id(sink).get(), "2 sink");
                                this.messages.push({
                                    edge: {
                                        label: {
                                            type: "subscription sink",
                                            v: this.id(sub).get(),
                                            w: this.id(sink).get(),
                                        },
                                        v: this.observerToObs(sub),
                                        w: this.observerToObs(sink),
                                    },
                                    id: this.messages.length,
                                    type: "edge",
                                });
                            });
                        }
                    }
                });
                break;
            case "event":
                let event = event_1.Event.fromRecord(record);
                if (event && event.type === "subscribe" || typeof event === "undefined") {
                    break;
                }
                let e = {
                    edge: { label: event, v: 0, w: 0 },
                    type: "edge",
                };
                this.messages.push(e);
            default:
        }
        return this;
    }
    after(record) {
        this.tags(record.returned);
        switch (callrecord_1.callRecordType(record)) {
            case "setup":
                let group = this.groups.pop();
                if (!isObservable(record.returned)) {
                    break;
                }
                let observable = this.id(record.returned).get();
                let observableSources = [record.subject, ...record.arguments]
                    .filter(v => isObservable(v) && !isSubscription(v))
                    .map(v => this.id(v).get());
                this.messages.push({
                    group: group.used ? group.id : undefined,
                    groups: this.groups.map(g => g.id),
                    label: {
                        args: formatArguments(record.arguments),
                        kind: "observable",
                        method: record.method,
                    },
                    node: observable,
                    type: "label",
                });
                this.messages.push(...observableSources.map(source => ({
                    edge: {
                        label: {
                            time: record.time,
                        },
                        v: source,
                        w: observable,
                    },
                    groups: this.groups.map(g => g.id),
                    type: "edge",
                })));
                break;
            case "subscribe":
                break;
            default:
        }
        return;
    }
    wrapHigherOrder(subject, fn) {
        let self = this;
        if (typeof fn === "function") {
            let wrap = function wrapper(val, id, subjectSuspect) {
                let result = fn.apply(this, arguments);
                if (typeof result === "object" && isStream(result) && subjectSuspect) {
                    return self.proxy(result);
                }
                return result;
            };
            wrap.__original = fn;
            return wrap;
        }
        return fn;
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
    tags(...items) {
        items.forEach(item => {
            if (typeof item !== "object") {
                return;
            }
            if (isSubscription(item) || isObservable(item)) {
                // Find in structure
                if (isSubscription(item) && isSubscription(item.observer)) {
                    this.tags(item.observer);
                }
                this.id(item).getOrSet(() => {
                    let id = this.messages.length;
                    if (isObservable(item)) {
                        this.messages.push({
                            id,
                            node: {
                                name: item.constructor.name || item.toString(),
                            },
                            type: "node",
                        });
                    }
                    return id;
                });
            }
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
exports.NewCollector = NewCollector;
class Collector {
    constructor() {
        this.indices = {
            observables: {},
            stackframes: {},
            subscriptions: {},
        };
        this.data = [];
        this.allRecords = [];
        this.trace = [];
        this.queue = [];
        this.groups = [];
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
        this.allRecords.push(record);
        this.queue.push(record);
        this.trace.push({
            groups: this.groups.map(g => g.call.method),
            kind: "before",
            method: record.method,
        });
        switch (callrecord_1.callRecordType(record)) {
            case "setup": {
                // Track group entry
                this.groups.push({
                    call: record,
                    id: 0,
                    used: false,
                });
                let item = new AddStructureEntry();
                item.id = this.data.length;
                item.method = record.method;
                item.parents = [];
                if (typeof record.subject !== "undefined") {
                    item.parents.push(this.observable(record.subject));
                }
                this.data.push(item);
                break;
            }
            default: break;
        }
        return this;
    }
    after(record) {
        this.trace.push({
            kind: "after",
            method: record.method,
        });
        if (callrecord_1.callRecordType(record) === "setup") {
            // Track group entry
            this.groups.pop();
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
                if (this.getObservable(sid)) {
                    // console.log("Subject", this.getObservable(sid), "found", "subs:",
                    //   this.data.filter(e => sid === (e as any).observableId))
                    let subs = this.data.filter(e => sid === e.observableId);
                    if (subs.length === 1) {
                        sid = subs[0].id;
                    }
                }
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
        if (node && node.kind === "subscription") {
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
        let parsed = ErrorStackParser.parse(record);
        return parsed.slice(1, 3).reduceRight((prev, stack) => {
            let id = this.indices.stackframes[stack.source];
            if (typeof id === "undefined") {
                this.indices.stackframes[stack.source] = id = this.data.length;
                let node = new AddStackFrame();
                node.id = id;
                node.stackframe = stack;
                node.parent = prev;
                this.data.push(node);
            }
            return id;
        }, undefined);
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
        if (record && record.parent) {
        }
        else if (this.queue.length > 0) {
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
Collector.collectorId = 0;
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Collector;
//# sourceMappingURL=logger.js.map