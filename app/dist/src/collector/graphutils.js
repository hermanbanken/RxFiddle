"use strict";
require("../utils");
const graphlib_1 = require("graphlib");
const _ = require("lodash");
const TRACE = false;
function trace(...args) {
    if (TRACE) {
        console.log.apply(console, arguments);
    }
}
function last(list) {
    return list[list.length - 1];
}
exports.last = last;
function head(list) {
    return list[0];
}
exports.head = head;
function takeWhile(list, pred) {
    let ret = [];
    for (let i = 0; i < list.length && pred(list[i]); i++) {
        ret.push(list[i]);
    }
    return ret;
}
exports.takeWhile = takeWhile;
function range(start, exclusiveEnd) {
    let r = [];
    for (let i = start; i < exclusiveEnd; i++) {
        r.push(i);
    }
    return r;
}
exports.range = range;
function avg(list) {
    if (list.length === 0) {
        return undefined;
    }
    if (list.length === 1) {
        return list[0];
    }
    return list.reduce((sum, v) => sum + (v / list.length), 0);
}
function absMin(a, b) {
    return Math.abs(a) < Math.abs(b) ? a : b;
}
function firstDefined(...args) {
    if (typeof args[0] !== "undefined") {
        return args[0];
    }
    if (args.length > 1) {
        return firstDefined(...args.slice(1));
    }
    return undefined;
}
function sort(input, byRefIndex) {
    return input.map((item, index) => ({ item, index, refIndex: byRefIndex(item) }))
        .sort((a, b) => {
        if (Array.isArray(a.refIndex) && Array.isArray(b.refIndex)) {
            for (let i = 0; i < a.refIndex.length; i++) {
                if (a.refIndex[i] !== b.refIndex[i]) {
                    return a.refIndex[0] - b.refIndex[0];
                }
            }
        }
        if (typeof a.refIndex === "number" && typeof b.refIndex === "number") {
            return a.refIndex - b.refIndex;
        }
        else {
            return 0;
        }
    }).map(v => v.item);
}
function sweep(input, direction, sort) {
    trace("Sweeping", direction);
    if (direction === "down") {
        for (let i = 1, ref = i - 1; i < input.length; i++, ref++) {
            input[i] = sort(input[i], input[ref]);
        }
    }
    else {
        for (let i = input.length - 2, ref = i + 1; i >= 0; i--, ref--) {
            input[i] = sort(input[i], input[ref]);
        }
    }
    return input;
}
exports.sweep = sweep;
/**
 * @see https://github.com/cpettitt/dagre/blob/master/lib/rank/util.js
 */
function rankLongestPath(g) {
    let visited = {};
    let ranks = {};
    function dfs(v) {
        if (_.has(visited, v)) {
            return ranks[v];
        }
        visited[v] = true;
        let rank = _.min(_.map(g.outEdges(v), (e) => {
            return dfs(e.w) - (g.edge(e) && g.edge(e).minlen || 1);
        }));
        if (rank === Number.POSITIVE_INFINITY || typeof rank === "undefined") {
            rank = 0;
        }
        return (ranks[v] = rank);
    }
    _.each(g.sources(), dfs);
    return ranks;
}
exports.rankLongestPath = rankLongestPath;
function rankFromTop(g) {
    let sanitized = new graphlib_1.Graph();
    g.edges().filter(e => e.v !== e.w).forEach(e => sanitized.setEdge(e.v, e.w));
    g.nodes().forEach(n => sanitized.setNode(n));
    let visited = {};
    let ranks = {};
    function dfs(v) {
        if (_.has(visited, v)) {
            return ranks[v];
        }
        visited[v] = true;
        let rank = _.max(_.map(sanitized.inEdges(v), (e) => {
            return dfs(e.v) + (g.edge(e) && g.edge(e).minlen || 1);
        }));
        if (rank === Number.NEGATIVE_INFINITY || typeof rank === "undefined") {
            rank = 0;
        }
        return (ranks[v] = rank);
    }
    _.each(sanitized.sinks(), dfs);
    return ranks;
}
exports.rankFromTop = rankFromTop;
function rankLongestPathGraph(g) {
    let ranked = g;
    let ranks = rankLongestPath(g);
    ranked.nodes().map(n => {
        ranked.node(n).rank = ranks[n];
    });
    return ranked;
}
exports.rankLongestPathGraph = rankLongestPathGraph;
function rankFromTopGraph(g) {
    let ranked = g;
    let ranks = rankFromTop(g);
    let allSet = true;
    ranked.nodes().map(n => {
        ranked.node(n).rank = ranks[n];
        if (typeof ranks[n] === "undefined") {
            allSet = false;
            console.error("No rank for " + n, ranks);
        }
    });
    return ranked;
}
exports.rankFromTopGraph = rankFromTopGraph;
function leftPad(l, a) {
    let r = `${a}`;
    while (r.length < l) {
        r = " " + r;
    }
    return r;
}
function rightPad(l, a) {
    let r = `${a}`;
    while (r.length < l) {
        r += " ";
    }
    return r;
}
const ENABLE_NORMALIZE = true;
const ENABLE_BARYCENTRESORT = true;
const ENABLE_PRIORITYLAYOUT = true;
// TODO make it online
function structureLayout(g) {
    let ranks = {};
    g.nodes().map(n => {
        ranks[n] = g.node(n).rank;
    });
    trace("ranks\n", ranks);
    // Without long edges
    let normalized;
    if (ENABLE_NORMALIZE) {
        normalized = g.flatMap((id, label) => [{ id, label }], (e) => {
            if (ranks[e.v] + 1 < ranks[e.w]) {
                // Add dummy nodes + edges
                let dummies = range(ranks[e.v] + 1, ranks[e.w]).map(i => ({ label: `dummy-${e.v}-${e.w}(${i})`, rank: i }));
                dummies.forEach(d => ranks[d.label] = d.rank);
                let nodes = [e.v].concat(dummies.map(d => d.label)).concat([e.w]);
                return nodes.slice(1).map((w, i) => ({
                    id: { v: nodes[i], w },
                    label: undefined,
                }));
            }
            else {
                return [{ id: e, label: undefined }];
            }
        });
    }
    else {
        normalized = g;
    }
    let byRank = groupByUniq(node => ranks[node], Object.keys(ranks));
    // Convert rank's vertices to layered layout items
    let layers = Object.keys(byRank).sort((a, b) => +a - +b).map((r, y) => {
        return byRank[r].map((n, x) => ({
            x,
            y,
            barycenter: 0,
            fixedX: g.node(n) && g.node(n).fixedX || 0,
            hierarchicOrder: g.node(n) && g.node(n).hierarchicOrder || [],
            isDummy: n.startsWith("dummy"),
            node: n,
            priority: 0,
            spacing: 1,
        }));
    });
    // Sort vertices according to BaryCenter's
    if (ENABLE_BARYCENTRESORT) {
        for (let iteration = 0; iteration < 10; iteration++) {
            let direction = iteration % 2 === 0 ? "down" : "up";
            sweep(layers, direction, (subject, ref) => {
                // Get node bary-center
                subject.forEach(item => {
                    item.barycenter = barycenter(normalized, direction, item.node, linked => ref.findIndex(r => r.node === linked));
                });
                // Retrieve hierarchies
                let groups = groupBy(n => 1 /* n.hierarchicOrder[1]*/, subject);
                let perLocation = Object.keys(groups).map(k => groups[k]);
                // Two sorting criteria: Location BC + Node BC
                let sortable = perLocation.flatMap(v => {
                    let loc = head(v.map(i => i.hierarchicOrder[1]));
                    // if(typeof loc === "undefined") {
                    return v.map(i => ({ item: i, sort: [i.barycenter, i.barycenter] }));
                    // } else {
                    //   let loc_bc = avg(v.map(i => i.barycenter))
                    //   return v.map(i => ({ item: i, sort: [loc_bc, i.barycenter] }))
                    // }
                });
                return sort(sortable, i => i.sort).map(i => i.item);
            });
            layers.reverse();
        }
    }
    // Bundle same hierarchies
    layers.forEach(layer => {
        let x = 0;
        layer.forEach((item, index, list) => {
            if (index === list.length - 1) {
                item.spacing = 1;
            }
            else if (typeof item.hierarchicOrder[1] !== "undefined" &&
                item.hierarchicOrder[1] === list[index + 1].hierarchicOrder[1]) {
                item.spacing = 0.4;
            }
            else {
                item.spacing = 1;
            }
            item.x = x;
            x += item.spacing;
        });
    });
    // // Assign x positions after ordering; keep fixed positions
    // layers.forEach(layer => {
    //   let fixed = layer.filter(l => l.fixedX).sort((a, b) => a.fixedX - b.fixedX)
    //   let nonfixed = layer.filter(l => typeof l.fixedX === "undefined")
    //   for(let i = 0, j = 0; i < layer.length; i++, j++) {
    //     if(fixed.length && fixed[0].fixedX <= i) {
    //       fixed[0].x = i
    //       fixed.shift()
    //       j--;
    //     } else {
    //       nonfixed[j].x = i
    //     }
    //   }
    // })
    // Balancing or centering relative to branches
    if (ENABLE_PRIORITYLAYOUT) {
        for (let iteration = 0; iteration < 10; iteration++) {
            let direction = iteration % 2 === 0 ? "down" : "up";
            sweep(layers, direction, (subject, ref) => {
                subject.forEach(item => {
                    item.priority = item.isDummy ? Number.MAX_SAFE_INTEGER : priority(normalized, direction, item.node);
                    item.barycenter = barycenter(normalized, direction, item.node, linked => head(ref.filter(r => r.node === linked).map(r => r.x)));
                });
                priorityLayoutAlign(subject);
                return subject;
            });
        }
        shiftOffset(layers);
    }
    let layout = layers.flatMap(v => v);
    // Convert dummy paths back to full paths
    let index = indexedBy(i => i.node, layout);
    let edges = g.edges().map(({ v, w }) => {
        let mids;
        if (ranks[v] + 1 < ranks[w]) {
            mids = range(ranks[v] + 1, ranks[w]).map(i => `dummy-${v}-${w}(${i})`)
                .map(k => index[k])
                .map(({ x, y }) => ({ x, y }));
        }
        else {
            mids = [];
        }
        return {
            v, w,
            points: [
                { x: index[v].x, y: index[v].y },
                ...mids,
                { x: index[w].x, y: index[w].y },
            ],
        };
    });
    return {
        graph: normalized,
        layout: layout.filter(v => !v.isDummy),
        edges,
    };
}
exports.structureLayout = structureLayout;
function linkedNodes(g, direction, node) {
    if (!g.hasNode(node)) {
        console.warn("looking for non-graph node", node);
        return [];
    }
    return direction === "down" ?
        g.inEdges(node).map(e => e.v) :
        g.outEdges(node).map(e => e.w);
}
function barycenter(g, direction, node, ref) {
    let nodes = linkedNodes(g, direction, node);
    // Find Barycenter
    let positions = nodes.map(ref).filter(v => typeof v === "number");
    return avg(positions);
}
function priority(g, direction, node) {
    let nodes = linkedNodes(g, direction, node);
    return nodes.length;
}
function priorityLayoutAlign(items) {
    let move = (priority, index, requestedShift) => {
        let subject = items[index];
        if (subject.priority > priority || requestedShift === 0) {
            return 0;
        }
        if (items.length === index + 1 && requestedShift > 0) {
            subject.x += requestedShift;
            return requestedShift;
        }
        if (index === 0 && requestedShift < 0) {
            subject.x += requestedShift;
            return requestedShift;
        }
        let spacing = items[index + Math.min(0, Math.sign(requestedShift))].spacing || 1;
        let next = index + Math.sign(requestedShift);
        let slack = absMin(requestedShift, items[next].x - subject.x - Math.sign(requestedShift) * spacing);
        // Bubble move
        let nextMoved = move(priority, next, requestedShift - slack);
        subject.x += slack + nextMoved;
        return slack + nextMoved;
    };
    // let backup = items.map(i => i.x)
    // let beforeDistance = items.map(i => i.barycenter - i.x).reduce((sum, n) => sum + n, 0)
    items
        .map((item, index) => ({ item, index }))
        .sort((a, b) => b.item.priority - a.item.priority)
        .forEach(({ item, index }) => {
        if (typeof item.barycenter !== "undefined") {
            move(item.priority, index, item.barycenter - item.x);
        }
    });
    // let afterDistance = items.map(i => i.barycenter - i.x).reduce((sum, n) => sum + n, 0)
    // if(afterDistance > beforeDistance) {
    //   backup.forEach((x, index) => items[index].x = x)
    // }
}
exports.priorityLayoutAlign = priorityLayoutAlign;
function shiftOffset(layers) {
    let max = Number.MAX_SAFE_INTEGER;
    let offset = layers.reduce((l, layer) => Math.min(l, layer.reduce((p, item) => Math.min(p, item.x), max)), max);
    layers.forEach(layer => layer.forEach(item => {
        item.x -= offset;
    }));
}
function lines(g) {
    let ranks = rankLongestPath(g);
    let grouped = _.mapValues(_.groupBy(_.toPairs(ranks), l => l[1]), v => v.map(n => n[0]));
    let groups = _.toPairs(grouped);
    let levels = groups
        .sort((a, b) => a[0] - b[0]);
    trace(levels.map(l => `${leftPad(5, l[0])}${l[1].map(leftPad.bind(null, 5)).join("")}`).join("\n"));
    let visited = {};
    let positions = {};
    function dfs(v, index = 0) {
        if (_.has(visited, v)) {
            return positions[v];
        }
        visited[v] = true;
        let rank = _.max(_.map(g.outEdges(v), (e, i) => { return dfs(e.w, i + index); }));
        if (rank === Number.POSITIVE_INFINITY || typeof rank === "undefined") {
            rank = index;
        }
        return (positions[v] = rank);
    }
    _.each(g.sources(), dfs);
    trace(positions);
    let ls = levels.map(l => {
        let row = l[1].reduce((text, n) => {
            let p = positions[n];
            text = rightPad(p * 4 + 4, text);
            return text.substr(0, p * 4) + leftPad(4, n) + text.substr((p + 1) * 4, text.length);
        }, "");
        return `${leftPad(5, l[0])}${row}`;
    }).join("\n");
    trace(ls);
    return [];
}
exports.lines = lines;
function indexedBy(selector, list) {
    let obj = {};
    list.forEach((i) => { obj[selector(i)] = i; });
    return obj;
}
exports.indexedBy = indexedBy;
function groupBy(selector, list) {
    let obj = {};
    list.forEach((i) => {
        let k = selector(i);
        obj[k] = obj[k] || [];
        obj[k].push(i);
    });
    return obj;
}
exports.groupBy = groupBy;
function groupByUniq(selector, list) {
    let obj = {};
    list.forEach((i) => {
        let k = selector(i);
        obj[k] = obj[k] || [];
        if (obj[k].indexOf(i) === -1) {
            obj[k].push(i);
        }
    });
    return obj;
}
exports.groupByUniq = groupByUniq;
function mapFilter(list, f) {
    return list.map(f).filter(v => typeof v !== "undefined");
}
exports.mapFilter = mapFilter;
function toDot(graph, props, edgeProps) {
    return "graph g {\n" +
        "node [style=filled];\n" +
        graph.nodes().map((n) => {
            if (props) {
                let data = props(n);
                let query = Object.keys(data).map(k => `${k}="${data[k]}"`).join(", ");
                return `"${n}" [${query}];`;
            }
            return `"${n}";`;
        }).join("\n") +
        graph.edges().map((e) => {
            if (edgeProps) {
                let data = edgeProps(e);
                let query = Object.keys(data).map(k => `${k}="${data[k]}"`).join(", ");
                return `${e.v} -- ${e.w} [${query}];`;
            }
            return e.v + " -- " + e.w + " [type=s];";
        }).join("\n") +
        "\n}";
}
exports.toDot = toDot;
//# sourceMappingURL=graphutils.js.map