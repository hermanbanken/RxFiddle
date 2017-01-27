"use strict";
const graphutils_1 = require("../collector/graphutils");
function normalize(g, createDummy) {
    let rank = (v) => g.node(v).rank;
    let dummyNodes = [];
    // Without long edges
    let normalized = g.flatMap((id, label) => [{ id, label }], (e, label) => {
        if (e.v === e.w || rank(e.v) === rank(e.w)) {
            return [];
        }
        if (rank(e.v) + 1 < rank(e.w)) {
            // Add dummy nodes + edges
            let dummies = graphutils_1.range(rank(e.v) + 1, rank(e.w)).map(i => ({ id: `dummy-${e.v}-${e.w}(${i})`, rank: i }));
            let nodes = [{ id: e.v, rank: rank(e.v) }].concat(dummies).concat([{ id: e.w, rank: rank(e.w) }]);
            dummyNodes.push(nodes);
            return paired(nodes, (v, w, i) => ({
                id: { v: v.id, w: w.id },
                label: { index: i, nodes: nodes.map(n => n.id), original: label },
            }));
        }
        else {
            return [{ id: e, label: { index: 0, nodes: [e.v, e.w], original: label } }];
        }
    });
    dummyNodes.forEach(ns => ns.forEach(n => {
        normalized.setNode(n.id, createDummy(n));
    }));
    // Assert ok
    normalized.edges().forEach(e => {
        if (normalized.node(e.v).rank + 1 !== normalized.node(e.w).rank) {
            throw new Error("Invalid edge from normalization");
        }
    });
    return normalized;
}
exports.normalize = normalize;
function denormalize(g) {
    return g.flatMap((id, label) => id.indexOf("dummy") === 0 ? [] : [{ id, label }], (id, label) => {
        return [{
                id: { v: label.nodes[0], w: label.nodes[label.nodes.length - 1] },
                label: {
                    nodes: label.nodes.slice(1, -1).map(n => g.node(n)),
                    original: label.original,
                },
            }];
    });
}
exports.denormalize = denormalize;
function paired(list, f) {
    return list.slice(1).map((w, i) => f(list[i], w, i));
}
//# sourceMappingURL=normalize.js.map