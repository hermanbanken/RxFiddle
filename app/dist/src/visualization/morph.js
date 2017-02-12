"use strict";
let morphModule = {
    prepare: (oldVNode, vnode) => {
        if (typeof oldVNode.data.attrs === "object" && typeof vnode.data.attrs === "object") {
            if (typeof oldVNode.data.attrs.d === "string" && typeof vnode.data.attrs.d === "string") {
                prepare(oldVNode, vnode);
            }
        }
    },
    update: (oldVNode, vnode) => {
        if (typeof vnode.data.morph === "object") {
            if (typeof vnode.data.morph["--final-d"] === "string") {
                keepEdgePointsEqual(oldVNode, vnode);
            }
        }
    },
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = morphModule;
let raf = (typeof window !== "undefined" && window.requestAnimationFrame) || setTimeout;
let nextFrame = (fn) => { raf(() => { raf(fn); }); };
function prepare(oldVNode, vnode) {
    let elm = oldVNode.elm;
    if (!elm) {
        console.warn("Prepatch without vnode element", oldVNode, vnode);
        return;
    }
    let oldAttrs = oldVNode.data.attrs || {};
    let attrs = vnode.data.attrs || {};
    let morph = vnode.data.morph = {};
    let od = oldAttrs.d;
    let nd = attrs.d;
    if (od === nd) {
        return;
    }
    let ocs = svgControls(od).join("");
    let ncs = svgControls(nd).join("");
    if (ocs === ncs) {
        return;
    }
    let expand = Math.abs(ocs.length - ncs.length);
    if (ocs.length < ncs.length) {
        // Expand
        let path = Path.parse(od).expand(expand).toString();
        morph["--current-d"] = od;
        morph["--immediate-d"] = path;
        morph["--final-d"] = attrs.d;
        attrs.d = path;
    }
    else {
        // Contract
        let path = Path.parse(nd).expand(expand).toString();
        morph["--current-d"] = od;
        morph["--nextframe-d"] = path;
        morph["--final-d"] = nd;
        attrs.d = od;
    }
}
/**
 * Ensures Edges keep the same amount of points.
 * Animation is only possible if the d attributes contains an equal amount of control points.
 */
function keepEdgePointsEqual(oldVNode, vnode) {
    let elm = vnode.elm;
    let morph = vnode.data.morph || {};
    let attrs = vnode.data.attrs || {};
    let final = morph["--final-d"];
    if (typeof morph["--immediate-d"] === "string") {
        if (elm.morphListener) {
            elm.removeEventListener("transitionend", elm.morphListener);
        }
        nextFrame(() => {
            elm.setAttribute("d", final);
            attrs.d = final;
        });
    }
    else {
        let listener = (ev) => {
            if (ev.target !== elm) {
                return;
            }
            elm.setAttribute("d", final);
            elm.removeEventListener("transitionend", listener);
        };
        elm.addEventListener("transitionend", listener);
        elm.setAttribute("d", morph["--nextframe-d"]);
        elm.morphListener = listener;
        nextFrame(() => {
            attrs.d = final;
        });
    }
    delete vnode.data.morph;
}
class Point {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
    toString() {
        return `${this.x} ${this.y}`;
    }
    delta(other) {
        return { dx: other.x - this.x, dy: other.y - this.y };
    }
}
exports.Point = Point;
class Path {
    static parse(path) {
        return new Path(Segment.parsePath(path));
    }
    constructor(segments) {
        this.segments = segments;
    }
    toString() {
        return this.segments.join(" ");
    }
    expand(adjust) {
        let output = this.segments.map((s, i) => i === this.segments.length - 1 ? s.expand(adjust) : s);
        return new Path(output);
    }
}
exports.Path = Path;
class Segment {
    static parsePath(path) {
        let ms = path.match(/[MLHVZCSQTA](([\s,]*([\d\.\_]+)+)*)/ig);
        let ss = ms.map(match => {
            let ps = match.substr(1).split(/[\s,]+/).filter(p => p.length > 0).map(n => parseFloat(n));
            return new Segment(match[0], ps);
        });
        return ss.reduce((p, n) => Segment.addOrConcat(p, n), []);
    }
    static addOrConcat(list, next) {
        let last = tail(list);
        return last ? list.slice(0, list.length - 1).concat(last.combine(next)) : [next];
    }
    get x() {
        return this.points[this.points.length - 2];
    }
    get y() {
        return this.points[this.points.length - 1];
    }
    get ps() {
        let arr = [];
        for (let i = 0; i + 1 < this.points.length; i += 2) {
            arr.push(new Point(this.points[i], this.points[i + 1]));
        }
        return arr;
    }
    get isAbsolute() {
        return this.modifier.toUpperCase() === this.modifier;
    }
    get deltas() {
        switch (this.modifier) {
            case "M":
            case "L":
            case "C":
                return sliced(this.ps, 2, 1)
                    .map(([a, b]) => ({ dx: b.x - a.x, dy: b.y - a.y }));
            case "m":
            case "l":
            case "c":
                return this.ps.map(({ x, y }) => ({ dx: x, dy: y }));
            default: throw new Error("deltas() not implemented for " + this.modifier);
        }
    }
    get ratios() {
        return this.deltas
            .filter(v => !(v.dx === 0 && v.dy === 0))
            .map(v => v.dx / v.dy);
    }
    get isStraight() {
        if (this.points.length === 2) {
            return true;
        }
        let ratio = this.ratios
            .reduce((p, n) => typeof p === "number" ? p === n && n : (typeof p === "undefined" ? n : false), undefined);
        return typeof ratio === "number";
    }
    get multiplicity() {
        switch (this.modifier) {
            case "M":
            case "m":
            case "L":
            case "l":
                return 1;
            case "Q":
            case "q":
                return 2;
            case "C":
            case "c":
                return 3;
            default: return 0;
        }
    }
    get slack() {
        return Math.max(0, this.points.length / (this.multiplicity * 2) - 1);
    }
    constructor(modifier, points) {
        this.modifier = modifier;
        this.points = points;
    }
    expand(adjust) {
        let ps = this.points.slice(0);
        // Duplicate end n times
        let arr = Array.apply(null, { length: this.multiplicity * adjust }).flatMap((_) => ps.slice(-2));
        ps.splice(ps.length, 0, ...arr);
        return new Segment(this.modifier, ps);
    }
    toString() {
        switch (this.modifier) {
            case "c":
            case "C":
                return sliced(this.ps, 3, 3).map(ps => "C " + ps.join(",")).join(" ");
            default: return this.ps.map(p => `${this.modifier} ${p}`).join(" ");
        }
    }
    combine(other) {
        if (other.modifier === this.modifier) {
            let deltas;
            if (other.isAbsolute) {
                deltas = this.deltas.concat([tail(this.ps).delta(other.ps[0])]).concat(other.deltas);
            }
            else {
                deltas = this.deltas.concat(other.deltas);
            }
            let rs = ratio(deltas);
            if (typeof rs !== "boolean") {
                return [new Segment(this.modifier, this.points.concat(other.points))];
            }
        }
        return [this, other];
    }
}
exports.Segment = Segment;
function ratio(deltas) {
    if (deltas.length === 1) {
        return undefined;
    }
    let ratios = deltas
        .filter(v => !(v.dx === 0 && v.dy === 0))
        .map(v => v.dx / v.dy);
    return ratios
        .reduce((p, n) => typeof p === "number" ? p === n && n : (typeof p === "undefined" ? n : false), undefined);
}
const SVGControlChars = "MLHVZCSQTA";
const SVGControls = new RegExp(`^[${SVGControlChars}]{1}$`, "i");
function svgControls(d) {
    return d.split("").filter(c => SVGControls.test(c));
}
function tail(list) {
    return list[list.length - 1];
}
function assert(b, message) {
    if (!b) {
        throw new Error("Assertion failed" + (message ? `: ${message}` : ""));
    }
    return;
}
function sliced(list, size, step) {
    let output = [];
    for (let i = 0; i + size <= list.length; i += step) {
        output.push(list.slice(i, i + size));
    }
    return output;
}
//# sourceMappingURL=morph.js.map