"use strict";
const index_1 = require("./index");
function wmedian(ranks, g, dir) {
    index_1.foreachTuple(dir, ranks, (row, ref, rowIndex) => {
        // Gather position of connected nodes per edge
        let indices = index_1.edges(g, dir, row).reduce((store, e) => {
            let index = ref.indexOf(dir === "down" ? e.v : e.w);
            if (index >= 0) {
                let n = dir === "down" ? e.w : e.v;
                store[n] = store[n] || [];
                store[n].push(index);
            }
            return store;
        }, {});
        // Don't forget unconnected - sad lonely - nodes :(
        row.forEach(n => indices[n] = indices[n] || []);
        // Sort by median and update
        let sortable = Object.keys(indices).map((n) => ({ n, median: median(indices[n]) }));
        ranks[rowIndex] = sortable.sort((a, b) => {
            if (a.median < 0 || b.median < 0) {
                return 0;
            }
            return a.median - b.median;
        }).map(i => i.n);
    });
}
exports.wmedian = wmedian;
function median(list) {
    let m = Math.floor(list.length / 2);
    if (list.length === 0) {
        return -1;
    }
    else if (list.length % 2 === 1) {
        return list[m];
    }
    else if (list.length === 2) {
        return (list[0] + list[1]) / 2;
    }
    else {
        let left = list[m - 1] - list[0];
        let right = list[list.length - 1] - list[m];
        return list[m - 1] * right + list[m] * left / (left + right);
    }
}
exports.median = median;
//# sourceMappingURL=median.js.map