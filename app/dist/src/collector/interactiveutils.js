"use strict";
require("../utils");
const typedgraph_1 = require("./typedgraph");
// TODO combine
// - join nodes of same parent based on StackFrame location
// - zipping any downstream relations too: if parent collapses => same rules apply
// - maintain count of join size
// - do not join if stackframe (?) is focussed
function combine(g) {
    let t = new typedgraph_1.default();
}
exports.combine = combine;
//# sourceMappingURL=interactiveutils.js.map