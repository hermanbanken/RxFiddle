"use strict";
const color_1 = require("../color");
require("../object/extensions");
require("../utils");
const typedgraph_1 = require("../collector/typedgraph");
const Rx = require("rx");
const layout_1 = require("./layout");
const snabbdom = require('snabbdom');
const patch = snabbdom.init([
    require('snabbdom/modules/class').default,
    require('snabbdom/modules/attributes').default,
    require('snabbdom/modules/style').default,
    require('snabbdom/modules/eventlisteners').default,
]);
const h = require('snabbdom/h').default; // helper function for creating vnodes
const emptyViewState = {
    focusNodes: [],
    openGroups: [],
    openGroupsAll: true,
};
class Grapher {
    constructor(collector, viewState = Rx.Observable.empty()) {
        this.graph = collector.dataObs
            .scan(this.next, new typedgraph_1.default())
            .combineLatest(viewState.startWith(emptyViewState), this.filter);
    }
    next(graph, event) {
        switch (event.type) {
            case "node":
                graph.setNode(`${event.id}`, {
                    labels: [],
                    name: event.node.name,
                });
                break;
            case "edge":
                let e = graph.edge(`${event.edge.v}`, `${event.edge.w}`) || {
                    labels: [],
                };
                e.labels.push(event);
                graph.setEdge(`${event.edge.v}`, `${event.edge.w}`, e);
                break;
            case "label":
                graph.node(`${event.node}`).labels.push(event);
                break;
            default: break;
        }
        return graph;
    }
    filter(graph, viewState) {
        return graph.filterNodes((id, node) => {
            let groups = node.labels.flatMap(l => l.groups || []);
            return viewState.openGroupsAll ||
                !groups ||
                groups.length === 0 ||
                (groups.slice(-1).find(g => viewState.openGroups.indexOf(g) >= 0) && true);
        });
    }
}
exports.Grapher = Grapher;
class Visualizer {
    constructor(grapher, dom, controls) {
        this.grapher = grapher;
        this.app = dom;
        this.DOM = grapher.graph.debounce(10).map(graph => {
            let l = layout_1.default(graph);
            console.log(graph.toDot(), l);
            // let render: VNode[] = []
            // let marbles: VNode[] = []
            // sg.renderMarbles(graph, this.choices)
            // let app = h("app", [
            //   h("master", [svg(l)].concat(marbles)),
            //   h("detail", [
            //     h("svg", {
            //       attrs: {
            //         id: "svg",
            //         style: "width: 200px; height: 200px",
            //         version: "1.1",
            //         xmlns: "http://www.w3.org/2000/svg",
            //       },
            //     }, render.concat(defs())),
            //   ]),
            // ])
            // return app
            return svg(l);
        });
    }
    run() {
        this.DOM.subscribe(d => patch(this.app, d));
    }
    attach(node) {
        this.app = node;
        this.step();
    }
    step() {
        // window.requestAnimationFrame(() => this.step())
        this.run();
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Visualizer;
function svg(l) {
    let u = 100;
    let mu = u / 2;
    let elements = l.flatMap((level, levelIndex) => {
        let edges = level.edges.map(({ v, w, points }) => {
            let path = points.map(({ x, y }) => `${mu + mu * x} ${mu + mu * y}`).join(" L ");
            return h("path", {
                attrs: {
                    d: `M${path}`,
                    fill: "transparent",
                    stroke: levelIndex === 0 ? "rgba(0,0,0,0.1)" : "gray",
                    // "stroke-dasharray": 5,
                    "stroke-width": levelIndex === 0 ? 10 : 2,
                },
                on: { mouseover: () => console.log() },
            });
        });
        return edges;
    }).concat(l[0].nodes.map(item => h("circle", {
        attrs: {
            cx: mu + mu * item.x,
            cy: mu + mu * item.y,
            fill: colorIndex(parseInt(item.id, 10)),
            r: 5,
        },
        on: {
            click: (e) => console.log(item.id),
        },
    })));
    let xmax = l
        .flatMap(level => level.nodes)
        .reduce((p, n) => Math.max(p, n.x), 0);
    console.log(elements);
    return h("svg", {
        attrs: {
            id: "structure",
            style: `width: ${xmax * u}px; height: ${u * (0.5 + elements.length)}px`,
            version: "1.1",
            xmlns: "http://www.w3.org/2000/svg",
        },
    }, elements);
}
const colors = color_1.generateColors(40);
function colorIndex(i) {
    if (typeof i === "undefined" || isNaN(i)) {
        return "transparent";
    }
    let [r, g, b] = colors[i % colors.length];
    return `rgb(${r},${g},${b})`;
}
window.colors = colors;
const defs = () => [h("defs", [
        h("marker", {
            attrs: {
                id: "arrow",
                markerHeight: 10,
                markerUnits: "strokeWidth",
                markerWidth: 10,
                orient: "auto",
                overflow: "visible",
                refx: 0, refy: 3,
            },
        }, [h("path", { attrs: { d: "M-4,-2 L-4,2 L0,0 z", fill: "inherit" } })]),
        h("marker", {
            attrs: {
                id: "arrow-reverse",
                markerHeight: 10,
                markerUnits: "strokeWidth",
                markerWidth: 10,
                orient: "auto",
                overflow: "visible",
                refx: 0, refy: 3,
            },
        }, [h("path", { attrs: { d: "M0,0 L4,2 L4,-2 z", fill: "blue" } })]),
    ])];
//# sourceMappingURL=index.js.map