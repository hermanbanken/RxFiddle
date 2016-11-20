"use strict";
const h = require("snabbdom/h");
function centeredRect(width, height, opts = {}) {
    return h("rect", {
        attrs: Object.assign({
            fill: "transparent",
            stroke: "black",
            "stroke-width": 2,
            width,
            height,
            x: -width / 2,
            y: -height / 2,
        }, opts),
    });
}
exports.centeredRect = centeredRect;
function centeredText(text, attrs = {}, opts = {}) {
    return h("text", Object.assign({
        attrs: Object.assign({
            x: 0,
            y: 0,
            "text-anchor": "middle",
            "alignment-baseline": "middle",
        }, attrs),
    }, opts), text);
}
exports.centeredText = centeredText;
//# sourceMappingURL=shapes.js.map