"use strict";
const h = require("snabbdom/h");
class RxFiddleEdge {
    constructor(from, to, type, options = {}) {
        this.from = from;
        this.to = to;
        this.type = type;
        this.points = [];
        this.options = Object.assign({
            dashed: false,
            fill: "transparent",
            stroke: "black",
            "stroke-width": 2,
        }, options);
    }
    render() {
        let path = qubicPath(this.points);
        let attrs = Object.assign({
            d: path,
        }, this.options);
        if (attrs.dashed) {
            attrs["stroke-dasharray"] = "5, 5";
        }
        delete attrs.dashed;
        return h("path", { attrs });
    }
}
exports.RxFiddleEdge = RxFiddleEdge;
function qubicPath(points) {
    if (points.length % 2 === 1) {
        let path = `M ${points[0].x} ${points[0].y}`;
        for (let i = 1; i < points.length; i += 2) {
            path += `Q ${points[i].x} ${points[i].y}, ${points[i + 1].x} ${points[i + 1].y}`;
        }
        return path;
    }
    else {
        return "M " + points.map((p) => `${p.x} ${p.y}`).join(" T ");
    }
}
//# sourceMappingURL=edge.js.map