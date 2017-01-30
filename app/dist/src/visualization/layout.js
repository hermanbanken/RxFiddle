"use strict";
const graphutils_1 = require("../collector/graphutils");
const normalize_1 = require("../layout/normalize");
const ordering_1 = require("../layout/ordering");
const priority_1 = require("../layout/priority");
require("../object/extensions");
require("../utils");
function layout(graph, focusNodes = []) {
    let ranked = normalize_1.normalize(graphutils_1.rankFromTopGraph(graph), v => ({ rank: v.rank }));
    let byRank = [];
    ranked.nodes().forEach((n) => {
        let rank = ranked.node(n).rank;
        byRank[rank] = (byRank[rank] || []).concat([n]);
    });
    let initialOrd = Object.values(byRank);
    // TODO verify neccessity of this step
    let rankedAndEdgeFixed = ranked.flatMap((id, label) => [{ id, label }], (id, label) => [{ id: ranked.node(id.v).rank < ranked.node(id.w).rank ? id : { v: id.w, w: id.v }, label }]);
    let ord = ordering_1.ordering(initialOrd, rankedAndEdgeFixed, ordering_1.fixingSort(focusNodes));
    let layout = priority_1.priorityLayout(ord, ranked, focusNodes);
    let byId = graphutils_1.indexedBy(n => n.id, layout);
    function fullEdge(v, w, edgeLookup, lookup) {
        let e = edgeLookup(v, w);
        if (typeof e === "undefined" || e.index > 0) {
            return undefined;
        }
        return ({
            points: e.nodes.map(lookup),
            v: e.nodes[0],
            w: e.nodes.slice(-1)[0],
        });
    }
    let edges = ranked.edges()
        .map(e => fullEdge(e.v, e.w, (v, w) => ranked.edge(v, w), n => byId[n]))
        .filter(v => typeof v !== "undefined");
    if (typeof window === "object") {
        window.graph = graph;
        window.ranked = ranked;
    }
    return [
        {
            edges: edges,
            nodes: layout.filter(node => node.id.indexOf("dummy") === -1),
        },
    ];
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = layout;
//# sourceMappingURL=layout.js.map