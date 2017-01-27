"use strict";
const index_1 = require("./index");
function sorting(a, b) {
    // Sort on v, 
    if (a.v !== b.v) {
        return a.v - b.v;
    }
    // or - only if equal v - we can swap w's as lines from same origin never cross
    return a.w - b.w;
}
function crossings(vRow, wRow, edges) {
    let map = edges.map(e => {
        let m = {
            v: vRow.indexOf(e.v),
            w: wRow.indexOf(e.w),
        };
        if (m.v < 0 || m.w < 0) {
            throw new Error(`Invalid edge <${e.v},${e.w}>; looking in 
      vRow: ${vRow},\nwRow: ${wRow}, 
      edges: ${edges.map(v => `${e.v}-${e.w}`).join(",")}`);
        }
        return m;
    }).sort(sorting);
    // Short-circuit if 0-crossings
    let max;
    max = map.reduce((p, n) => n.w > p ? n.w : Number.MAX_SAFE_INTEGER, -1);
    if (max !== Number.MAX_SAFE_INTEGER) {
        return 0;
    }
    let crossings = 0;
    for (let i = 0; i < map.length; i++) {
        for (let j = 0; j < i; j++) {
            if (map[i].w < map[j].w) {
                crossings++;
            }
        }
    }
    return crossings;
}
exports.crossings = crossings;
function order_crossings(order, g) {
    let count = 0;
    index_1.foreachTuple("down", order, (row, ref) => {
        let es = index_1.flip(index_1.edges(g, "down", row));
        try {
            count += crossings(row, ref, es);
        }
        catch (e) {
            console.log("Error in down sweep of ordering:\n" + order.map(r => {
                let prefix = row === r && "row -> " || ref === r && "ref -> " || "       ";
                return prefix + r.join(", ");
            }).join("\n") + "\nEdges: " + es.map(e => e.v + "->" + e.w).join("; ") + "\n", g);
            throw e;
        }
    });
    return count;
}
exports.order_crossings = order_crossings;
//# sourceMappingURL=crossings.js.map