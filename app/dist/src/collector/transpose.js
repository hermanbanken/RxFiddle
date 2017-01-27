"use strict";
require("../utils");
const crossings_1 = require("./crossings");
function neg(d) { return d === "up" ? "down" : "up"; }
/*
 * @see http://www.graphviz.org/Documentation/TSE93.pdf page 16
 */
function transpose(ranks, g, direction) {
    let improved = true;
    while (improved) {
        improved = false;
        // walk tuples of ranks
        foreachTuple(direction, ranks, (rank, ref) => {
            // walk single rank by node tuples left-to-right
            foreachTuple("down", rank, (w, v, j, i) => {
                let es = edges(g, direction, [v, w]);
                if (direction === "down") {
                    es = flip(es);
                }
                if (crossings_1.crossings([v, w], ref, es) > crossings_1.crossings([w, v], ref, es)) {
                    improved = true;
                    let tmp = rank[i];
                    rank[i] = rank[j];
                    rank[j] = tmp;
                }
            });
        });
    }
    return ranks;
}
exports.transpose = transpose;
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
function flip(es) {
    return es.map(({ v, w }) => ({ v: w, w: v }));
}
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
//# sourceMappingURL=transpose.js.map