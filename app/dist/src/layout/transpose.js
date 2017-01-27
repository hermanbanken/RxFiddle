"use strict";
require("../utils");
const crossings_1 = require("./crossings");
const index_1 = require("./index");
/*
 * @see http://www.graphviz.org/Documentation/TSE93.pdf page 16
 */
function transpose(ranks, g, direction) {
    let improved = true;
    while (improved) {
        improved = false;
        // walk tuples of ranks
        index_1.foreachTuple(direction, ranks, (rank, ref) => {
            // walk single rank by node tuples left-to-right
            index_1.foreachTuple("down", rank, (w, v, j, i) => {
                let es = index_1.edges(g, direction, [v, w]);
                if (direction === "down") {
                    es = index_1.flip(es);
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
//# sourceMappingURL=transpose.js.map