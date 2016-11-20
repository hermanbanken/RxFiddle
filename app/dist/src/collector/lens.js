"use strict";
const logger_1 = require("./logger");
function subsLens(collector, subs) {
    let events = () => {
        let subsIds = subs().map(s => s.id);
        return subsIds
            .map(subId => collector.indices.subscriptions[subId].events)
            .map(eventIds => eventIds.map(eid => collector.getEvent(eid)))
            .reduce((list, next) => list.concat(next), [])
            .map(e => e.event);
    };
    let scoping = () => {
        return subs().map(s => s.id)
            .map(subId => collector.indices.subscriptions[subId].scoping)
            .reduce((list, ls) => list.concat(ls), [])
            .map(subId => collector.getSubscription(subId));
    };
    return {
        all: () => subs(),
        completes: () => events().filter(e => e.type === "complete"),
        errors: () => events().filter(e => e.type === "error"),
        events,
        nexts: () => events().filter(e => e.type === "next"),
        scoping: () => subsLens(collector, scoping),
    };
}
function obsLens(collector, get) {
    let subs = () => {
        let obsIds = get().map(o => o.id);
        return obsIds
            .map(id => collector.indices.observables[id].subscriptions)
            .map(subIds => subIds.map(subId => collector.getSubscription(subId)))
            .reduce((list, next) => list.concat(next), []);
    };
    return {
        all: () => get(),
        childs: () => {
            let query = () => get()
                .map(_ => collector.indices.observables[_.id].childs)
                .reduce((list, _) => list.concat(_), [])
                .map(i => collector.getObservable(i))
                .filter(_ => typeof _.callParent === "undefined");
            return obsLens(collector, query);
        },
        each: () => get().map(obs => obsLens(collector, () => [obs])),
        internals: () => {
            let query = () => {
                let ids = get().map(o => o.id);
                return collector.data
                    .filter(o => o instanceof logger_1.AddObservable &&
                    typeof o.callParent === "number" &&
                    ids.indexOf(o.callParent) >= 0);
            };
            return obsLens(collector, query);
        },
        subscriptions: () => subsLens(collector, subs),
    };
}
function lens(collector) {
    return {
        all: () => {
            let obs = () => collector.data
                .filter(e => e instanceof logger_1.AddObservable);
            return obsLens(collector, obs);
        },
        find: (selector) => {
            let obs = () => typeof selector === "number" ?
                [collector.getObservable(selector)] :
                collector.data.filter(e => e instanceof logger_1.AddObservable &&
                    (e.method === selector));
            return obsLens(collector, obs);
        },
        roots: () => {
            let obs = () => collector.data
                .filter(e => e instanceof logger_1.AddObservable && e.parents.length === 0);
            return obsLens(collector, obs);
        }
    };
}
exports.lens = lens;
//# sourceMappingURL=lens.js.map