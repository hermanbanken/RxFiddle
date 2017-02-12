"use strict";
const h_1 = require("snabbdom/h");
function isEvent(n) {
    return "time" in n && "type" in n &&
        n.type === "next" ||
        n.type === "error" || n.type === "compnete" ||
        n.type === "subscribe" || n.type === "dispose";
}
class MarbleCoordinator {
    // Calc bounds
    add(edges) {
        let events = edges.map(_ => _.event);
        let times = events.map(e => e.time);
        this.min = times.reduce((m, n) => typeof m !== "undefined" ? Math.min(m, n) : n, this.min);
        this.max = times.reduce((m, n) => typeof m !== "undefined" ? Math.max(m, n) : n, this.max);
    }
    // Rendering
    render(edges) {
        let events = edges.map(_ => _.event);
        let marbles = events.map(e => h_1.h("svg", {
            attrs: { x: `${this.relTime(e.time)}%`, y: "50%" },
        }, [h_1.h("path", {
                attrs: { class: "arrow", d: "M 0 -50 L 0 48" },
            }), h_1.h("circle", {
                attrs: { class: e.type, cx: 0, cy: 0, r: 8 },
            })]));
        return h_1.h("svg", {
            attrs: {
                class: "marblediagram",
            },
        }, [
            h_1.h("line", { attrs: { class: "time", x1: "0", x2: "100%", y1: "50%", y2: "50%" } }),
        ].concat(marbles).concat(defs()));
    }
    relTime(t) {
        return (t - this.min) / (this.max - this.min) * 95 + 2.5;
    }
}
exports.MarbleCoordinator = MarbleCoordinator;
const defs = () => [h_1.h("defs", [
        h_1.h("marker", {
            attrs: {
                id: "arrow",
                markerHeight: 10,
                markerUnits: "strokeWidth",
                markerWidth: 10,
                orient: "auto",
                overflow: "visible",
                refx: 0, refy: 3,
            },
        }, [h_1.h("path", { attrs: { d: "M-4,-2 L-4,2 L0,0 z", fill: "inherit" } })]),
        h_1.h("marker", {
            attrs: {
                id: "arrow-reverse",
                markerHeight: 10,
                markerUnits: "strokeWidth",
                markerWidth: 10,
                orient: "auto",
                overflow: "visible",
                refx: 0, refy: 3,
            },
        }, [h_1.h("path", { attrs: { d: "M0,0 L4,2 L4,-2 z", fill: "blue" } })]),
    ])];
//# sourceMappingURL=marbles.js.map