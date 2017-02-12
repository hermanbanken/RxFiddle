"use strict";
const callrecord_1 = require("./callrecord");
const event_1 = require("./event");
const logger_1 = require("./logger");
const Rx = require("rx");
function isStream(v) {
    return v instanceof Rx.Observable;
}
function isSubscription(v) {
    return typeof v === "object" && v !== null && typeof v.dispose === "function";
}
function isObservable(v) {
    return typeof v === "object" && v !== null && typeof v.subscribe === "function";
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
        this.messages = [];
        this.observerStorage = new logger_1.ObserverStorage();
        this.groups = [];
        this.groupId = 0;
        this.collectorId = NewCollector.collectorId++;
        this.hash = this.collectorId ? `__hash${this.collectorId}` : "__hash";
    }
    static reset() {
        this.collectorId = 0;
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
            case "event":
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
                let event = event_1.Event.fromRecord(record);
                if (event && event.type === "subscribe" || typeof event === "undefined") {
                    break;
                }
                let sub = this.findRootObserverId(record.subject);
                let e = {
                    label: {
                        event,
                        subscription: sub,
                        type: "event",
                    },
                    node: this.observerToObs(sub),
                    type: "label",
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
                        args: logger_1.formatArguments(record.arguments),
                        method: record.method,
                        type: "observable",
                    },
                    node: observable,
                    type: "label",
                });
                this.messages.push(...observableSources.map(source => ({
                    edge: {
                        label: {
                            time: record.time,
                            type: "observable link",
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
            // tslint:disable-next-line:only-arrow-functions
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
    findRootObserverId(observer) {
        if (typeof observer === "object" && observer.observer) {
            return this.id(observer.observer).get();
        }
        else {
            return this.id(observer).get();
        }
    }
}
NewCollector.collectorId = 0;
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = NewCollector;
//# sourceMappingURL=collector.js.map