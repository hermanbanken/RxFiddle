"use strict";
const ascii_1 = require("./ascii");
const shapes_1 = require("./shapes");
/* tslint:disable:no-var-requires */
const h = require("snabbdom/h");
function partition(array, fn) {
    let a = [];
    let b = [];
    for (let i = 0; i < array.length; i++) {
        if (fn(array[i], i, array)) {
            a.push(array[i]);
        }
        else {
            b.push(array[i]);
        }
    }
    return [a, b];
}
exports.partition = partition;
class RxFiddleNode {
    constructor(id, name, location, visualizer) {
        this.id = id;
        this.name = name;
        this.location = location;
        this.visualizer = visualizer;
        this.instances = [];
        this.observers = [];
        this.width = 120;
        this.height = 20;
        this.hoover = false;
        this.nested = [];
        this.count = 0;
    }
    static wrap(inner, outer) {
        outer.nested.push(inner);
        return outer;
    }
    get edges() {
        return this.visualizer.g.neighbors(this.id);
    }
    addObservable(instance) {
        this.instances.push(instance);
        return this;
    }
    get locationText() {
        return typeof this.location !== "undefined" ? this.location.source.replace(window.location.origin, "") : undefined;
    }
    addObserver(observable, observer) {
        this.observers.push([observable, observer, []]);
        this.size();
        return this.observers[this.observers.length - 1];
    }
    size() {
        let extra = { h: 0, w: 0 };
        let size = {
            h: this.observers.length * 20 + 20 + extra.h,
            w: Math.max(120, extra.w),
        };
        this.width = size.w;
        this.height = size.h;
        return size;
    }
    setHoover(enabled) {
        this.hoover = enabled;
        return this;
    }
    layout() {
        this.size();
    }
    setHighlight(index) {
        this.highlightIndex = index;
        this.highlightId = typeof index !== "undefined" ? this.observers[index][1].id : undefined;
        this.visualizer.highlightSubscriptionSource(this.highlightId);
        return this;
    }
    setHighlightId(patch, id) {
        this.highlightIndex = this.observers.findIndex((o) => o[1].id === id);
        this.highlightId = id;
        try {
            if (this.rendered) {
                patch(this.rendered, this.render(patch));
            }
        }
        catch (e) {
            console.warn("error while rendering", this, this.count, e);
        }
        return this;
    }
    render(patch, showIds = false) {
        let streams = ascii_1.render(this.observers.map(_ => ({ events: _[2], id: showIds ? _[1].id + "" : undefined })))
            .map((stream, i) => shapes_1.centeredText(stream || "?", {
            fill: this.highlightIndex === i ? "red" : "black",
            y: this.line(i + 1), "font-family": "monospace",
        }, {
            on: {
                mouseout: () => patch(result, this.setHighlight().render(patch)),
                mouseover: () => patch(result, this.setHighlight(i).render(patch)),
            },
        }));
        if (typeof this.x === "undefined") {
            console.log("Undefined coords", this);
        }
        let result = h("g", {
            attrs: {
                height: this.height,
                id: `node-${this.id}`,
                transform: `translate(${this.x},${this.y})`,
                width: this.width,
            },
            on: {
                click: () => console.log(this),
                mouseout: () => patch(result, this.setHoover(false).render(patch)),
                mouseover: () => patch(result, this.setHoover(true).render(patch)),
            },
        }, [
            this.hoover ? this.dialog() : undefined,
            shapes_1.centeredRect(this.width, this.height, {
                rx: 10, ry: 10,
                "stroke-width": 2,
                stroke: this.hoover || typeof this.highlightId !== "undefined" ? "red" : "black",
            }),
            shapes_1.centeredText(showIds ? `${this.id} ${this.name}` : this.name, { y: this.line(0) }),
            // subgraph
            h("g", {
                attrs: { transform: `translate(${this.width / -2}, ${this.line(this.observers.length) + 10})` },
            }),
        ].concat(streams).filter(id => id));
        this.rendered = result;
        this.count++;
        return result;
    }
    line(i) {
        return -this.height / 2 + i * 20 + 10;
    }
    dialog() {
        let width = 200;
        let height = 200;
        let triangle = `M ${width / -2 - 5} 0 l 5 -5 l 0 10 Z`;
        return h("g", {
            attrs: { transform: `translate(${this.width / 2 + width / 2 + 5},${0})`, width, height },
        }, [
            h("path", { attrs: { d: triangle, fill: "black" } }),
            shapes_1.centeredRect(width, height, { rx: 10, ry: 10, fill: "white", "z-index": 10 }),
        ]);
    }
}
exports.RxFiddleNode = RxFiddleNode;
//# sourceMappingURL=node.js.map