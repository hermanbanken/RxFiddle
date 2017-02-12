"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    equalPoints: keepEdgePointsEqual,
};
/**
 * Ensures Edges keep the same amount of points.
 * Animation is only possible if the d attributes contains an equal amount of control points.
 */
function keepEdgePointsEqual(oldVNode, vnode) {
    let od = oldVNode.data.attrs.d;
    let nd = vnode.data.attrs.d;
    if (od === nd) {
        return;
    }
    let ocs = svgControls(od).join("");
    let ncs = svgControls(nd).join("");
    if (ocs === ncs) {
        return;
    }
    if (ocs === ncs.substring(0, -1)) {
        // New path is longer: insert dummy point
        od.split(`${SVGControlChars}`);
        let li = od.lastIndexOf(ocs.slice(-1)[0]);
        let od, substr = (li + 1);
    }
    console.log("edge update\n", ocs, ncs);
}
const SVGControlChars = "MLHVZCSQTA";
const SVGControls = new RegExp(`^[${SVGControlChars}]{1}$`, "i");
function svgControls(d) {
    return d.split("").filter(c => SVGControls.test(c));
}
//# sourceMappingURL=animate.js.map