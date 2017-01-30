"use strict";
const event_1 = require("./event");
const logger_1 = require("./logger");
const Rx = require("rx");
class JsonCollector {
    constructor(url) {
        this.data = [];
        this.indices = {
            observables: {},
            stackframes: {},
            subscriptions: {},
        };
        this.subject = new Rx.Subject();
        this.write = () => {
            // intentionally left blank
        };
        this.url = url;
        if (url.startsWith("ws://")) {
            let socket = new WebSocket(url);
            socket.onmessage = (m) => this.receive(JSON.parse(m.data));
            this.write = (d) => socket.send(JSON.stringify(d));
        }
        else {
            fetch(url).then(res => res.json()).then(data => {
                if (typeof window !== "undefined") {
                    window.data = data;
                    console.info("window.data is now filled with JSON data of", url);
                }
                if (typeof data === "object" && Array.isArray(data)) {
                    data.forEach(v => this.receive(v));
                }
            });
        }
        this.dataObs = this.subject.asObservable();
    }
    get length() {
        return this.data.length;
    }
    getLog(id) {
        return this.data[id];
    }
    getStack(id) {
        if (this.data[id] instanceof logger_1.AddStackFrame) {
            return this.data[id];
        }
        else {
            return null;
        }
    }
    getObservable(id) {
        if (this.data[id] instanceof logger_1.AddObservable) {
            return this.data[id];
        }
        else {
            return null;
        }
    }
    getSubscription(id) {
        if ("observableId" in this.data[id]) {
            return this.data[id];
        }
        else {
            return null;
        }
    }
    getEvent(id) {
        if (this.data[id] instanceof logger_1.AddEvent) {
            return this.data[id];
        }
        else {
            return null;
        }
    }
    receive(v) {
        this.subject.onNext(v);
        if ("event" in v && "subscription" in v) {
            let r = this.merge(new logger_1.AddEvent(), v, {
                event: event_1.Event.fromJson(v.event)
            });
            this.data.push(r);
            // index
            let index = this.indices.subscriptions[r.subscription];
            if (typeof index === "undefined") {
                index = this.indices.subscriptions[r.subscription] = { events: [], scoping: [] };
            }
            index.events.push(this.data.length - 1);
        }
        if ("observableId" in v) {
            let r = this.merge(new logger_1.AddSubscriptionImpl(), v);
            this.data.push(r);
            // index
            if (typeof r.scopeId !== "undefined") {
                if (typeof this.indices.subscriptions[r.scopeId] === "object") {
                    this.indices.subscriptions[r.scopeId].scoping.push(r.id);
                }
                else {
                    console.warn("Invalid index", this.indices, "scopeId", r.scopeId, "id", r.id);
                }
            }
        }
        if ("stackframe" in v) {
            let r = this.merge(new logger_1.AddStackFrame(), v);
            this.data.push(r);
            // index
            this.indices.stackframes[r.stackframe.source] = r.id;
        }
        if ("method" in v) {
            let r = this.merge(new logger_1.AddObservable(), v);
            this.data.push(r);
            // index
            this.indices.observables[r.id] = { childs: [], inner: [], subscriptions: [] };
            r.parents.forEach(parent => {
                let index = this.indices.observables[parent];
                if (typeof index !== "undefined") {
                    index.childs.push(r.id);
                }
            });
        }
    }
    merge(fresh, ...inputs) {
        for (let input of inputs) {
            for (let key in input) {
                if (input.hasOwnProperty(key)) {
                    fresh[key] = input[key];
                }
            }
        }
        return fresh;
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = JsonCollector;
//# sourceMappingURL=jsonCollector.js.map