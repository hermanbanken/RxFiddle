"use strict";
function crossings(vRow, wRow, edges) {
    let map = edges.map(e => {
        let m = {
            v: vRow.indexOf(e.v),
            w: wRow.indexOf(e.w)
        };
        if (m.v < 0 || m.w < 0)
            throw new Error(`Invalid edge <${e.v},${e.w}>`);
        return m;
    }).sort((a, b) => a.v - b.v);
    // Short-circuit if 0-crossings
    let max;
    max = map.reduce((p, n) => n.w > p ? n.w : Number.MAX_SAFE_INTEGER, -1);
    if (max !== Number.MAX_SAFE_INTEGER) {
        return 0;
    }
    let crossings = 0;
    for (let i = 0; i < map.length; i++) {
        for (let j = 0; j < i; j++) {
            if (map[i].w < map[j].w)
                crossings++;
        }
    }
    return crossings;
}
exports.crossings = crossings;
//# sourceMappingURL=crossings.js.map