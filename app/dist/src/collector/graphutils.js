"use strict";
require("../utils");
const _ = require("lodash");
/**
 * @see https://github.com/cpettitt/dagre/blob/master/lib/rank/util.js
 */
function rankLongestPath(g) {
    let visited = {};
    function dfs(v) {
        let label = g.node(v);
        if (_.has(visited, v)) {
            return label.rank;
        }
        visited[v] = true;
        let rank = _.min(_.map(g.outEdges(v), (e) => {
            return dfs(e.w) - g.edge(e).minlen;
        }));
        if (rank === Number.POSITIVE_INFINITY) {
            rank = 0;
        }
        return (label.rank = rank);
    }
    _.each(g.sources(), dfs);
}
exports.rankLongestPath = rankLongestPath;
function slack(g, e) {
    return g.node(e.w).rank - g.node(e.v).rank - g.edge(e).minlen;
}
exports.slack = slack;
//# sourceMappingURL=graphutils.js.map