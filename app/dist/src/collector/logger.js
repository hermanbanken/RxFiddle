"use strict";
const collector_1 = require("./collector");
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = collector_1.default;
function numkeys(obj) {
    return Object.keys(obj)
        .map(v => typeof v === "number" ? v : parseInt(v, 10))
        .filter(v => !isNaN(v));
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
function instanceAddSubscription(input) {
    return typeof input !== "undefined" && "observableId" in input && "id" in input;
}
exports.instanceAddSubscription = instanceAddSubscription;
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
//# sourceMappingURL=logger.js.map