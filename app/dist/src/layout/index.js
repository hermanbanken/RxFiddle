"use strict";
require("../utils");
function neg(d) { return d === "up" ? "down" : "up"; }
exports.neg = neg;
function foreachTuple(direction, list, f) {
    if (direction === "down") {
        for (let i = 1, ref = i - 1; i < list.length; i++, ref++) {
            f(list[i], list[ref], i, ref);
        }
    }
    else {
        for (let i = list.length - 2, ref = i + 1; i >= 0; i--, ref--) {
            f(list[i], list[ref], i, ref);
        }
    }
}
exports.foreachTuple = foreachTuple;
function flip(es) {
    return es.map(({ v, w }) => ({ v: w, w: v }));
}
exports.flip = flip;
function edges(g, direction, nodes) {
    return nodes.flatMap(node => {
        if (!g.hasNode(node)) {
            console.warn("looking for non-graph node", node);
            return [];
        }
        return direction === "down" ?
            g.inEdges(node) :
            g.outEdges(node);
    });
}
exports.edges = edges;
//# sourceMappingURL=index.js.map