"use strict";
const index_1 = require("./index");
function priorityLayout(ranks, g) {
    let nodes = ranks.map((row, y) => row.map((n, x) => ({
        y,
        x,
        barycenter: 0,
        id: n,
        isDummy: false,
        priority: 0,
    })));
    for (let i = 0; i < 20; i++) {
        let direction = i % 2 === 0 ? "down" : "up";
        index_1.foreachTuple(direction, nodes, (row, ref) => {
            row.forEach(item => {
                item.priority = item.isDummy ? Number.MAX_SAFE_INTEGER : priority(g, direction, item.id);
                item.barycenter = barycenter(g, direction, item.id, linked => head(ref.filter(r => r.id === linked).map(r => r.x)));
            });
            priorityLayoutAlign(row);
            return row;
        });
    }
    shiftOffset(nodes);
    return nodes.flatMap(id => id);
}
exports.priorityLayout = priorityLayout;
function shiftOffset(layers) {
    let max = Number.MAX_SAFE_INTEGER;
    let offset = layers.reduce((l, layer) => Math.min(l, layer.reduce((p, item) => Math.min(p, item.x), max)), max);
    layers.forEach(layer => layer.forEach(item => {
        item.x -= offset;
    }));
}
function head(list) {
    return list[0];
}
exports.head = head;
function linkedNodes(g, direction, node) {
    if (!g.hasNode(node)) {
        console.warn("looking for non-graph node", node);
        return [];
    }
    return direction === "down" ?
        g.inEdges(node).map(e => e.v) :
        g.outEdges(node).map(e => e.w);
}
function avg(list) {
    if (list.length === 0) {
        return undefined;
    }
    if (list.length === 1) {
        return list[0];
    }
    return list.reduce((sum, v) => sum + (v / list.length), 0);
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
function absMin(a, b) {
    return Math.abs(a) < Math.abs(b) ? a : b;
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
            let slack = Math.max(0, subject.x);
            let moved = Math.max(requestedShift, -slack);
            subject.x += moved;
            return moved;
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
//# sourceMappingURL=priority.js.map