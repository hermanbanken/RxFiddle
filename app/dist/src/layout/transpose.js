"use strict";
require("../utils");
const crossings_1 = require("./crossings");
const index_1 = require("./index");
exports.debug = {
    on: false,
};
/*
 * @see http://www.graphviz.org/Documentation/TSE93.pdf page 16
 */
function transpose(ranks, g, direction, externalSort) {
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
                let xsort = typeof externalSort === "undefined" ? 0 : externalSort(v, w);
                if (xsort > 0 || xsort === 0 && crossings_1.crossings([v, w], ref, es) > crossings_1.crossings([w, v], ref, es)) {
                    improved = true;
                    swap(rank, i, j);
                }
            });
        });
    }
    return ranks;
}
exports.transpose = transpose;
function swap(list, i, j) {
    let tmp = list[i];
    list[i] = list[j];
    list[j] = tmp;
}
//# sourceMappingURL=transpose.js.map