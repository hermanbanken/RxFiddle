"use strict";
const typedgraph_1 = require("../collector/typedgraph");
const color_1 = require("../color");
require("../object/extensions");
require("../utils");
const layout_1 = require("./layout");
const Rx = require("rx");
const snabbdom_1 = require("snabbdom");
const attributes_1 = require("snabbdom/modules/attributes");
const class_1 = require("snabbdom/modules/class");
const eventlisteners_1 = require("snabbdom/modules/eventlisteners");
const style_1 = require("snabbdom/modules/style");
const patch = snabbdom_1.init([class_1.default, attributes_1.default, style_1.default, eventlisteners_1.default]);
const emptyViewState = {
    focusNodes: ["5", "39", "2"],
    openGroups: [],
    openGroupsAll: true,
};
class Grapher {
    constructor(collector) {
        // this.viewState = viewState.startWith(emptyViewState)
        this.graph = collector.dataObs
            .scan(this.next, new typedgraph_1.default());
        // .combineLatest(this.viewState, this.filter)
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
}
exports.Grapher = Grapher;
class Visualizer {
    constructor(grapher, dom, controls) {
        // TODO workaround for Rx.Subject's
        this.focusNodes = new Rx.Subject();
        this.openGroups = new Rx.Subject();
        this.grapher = grapher;
        this.app = dom;
        let inp = grapher.graph
            .debounce(10)
            .combineLatest(this.viewState, (graph, state) => {
            let filtered = this.filter(graph, state);
            return ({
                focusNodes: state.focusNodes,
                graph: filtered,
                layout: layout_1.default(filtered, state.focusNodes),
            });
        });
        let { svg, clicks } = graph$(inp);
        this.DOM = svg;
        this.clicks = clicks;
        // new StructureGraph().renderMarbles(graph, choices)
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
    }
    get viewState() {
        return this.focusNodes.startWith([]).combineLatest(this.openGroups.startWith([]), (fn, og) => ({
            focusNodes: fn,
            openGroups: og,
            openGroupsAll: true,
        }));
    }
    run() {
        this.DOM
            .subscribe(d => this.app = patch(this.app, d));
        this.clicks
            .scan((list, n) => list.indexOf(n) >= 0 ? list.filter(i => i !== n) : list.concat([n]), [])
            .startWith([])
            .subscribe(this.focusNodes);
    }
    attach(node) {
        this.app = node;
        this.step();
    }
    step() {
        this.run();
    }
    filter(graph, viewState) {
        return graph.filterNodes((id, node) => {
            let groups = node.labels.flatMap(l => l.groups || []);
            return viewState.openGroupsAll ||
                !groups ||
                groups.length === 0 ||
                (groups.slice(-1).find(g => viewState.openGroups.indexOf(`${g}`) >= 0) && true);
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Visualizer;
function graph$(inp) {
    let result = inp.map(data => {
        return graph(data.layout, data.focusNodes, data.graph);
    }).publish().refCount();
    return {
        clicks: result.flatMap(_ => _.clicks),
        svg: result.map(_ => _.svg),
    };
}
const u = 100;
const mu = u / 2;
function graph(l, focusNodes, graph) {
    console.log("Layout", l);
    function edge(edge) {
        let { v, w, points } = edge;
        let labels = graph.edge(v, w).labels;
        let isHigher = labels.map(_ => _.edge.label).map((_) => _.type).indexOf("higherOrderSubscription sink") >= 0;
        let path = points.map(({ x, y }) => `${mu + mu * x} ${mu + mu * y}`).join(" L ");
        return snabbdom_1.h("path", {
            attrs: {
                d: `M${path}`,
                fill: "transparent",
                id: `${v}/${w}`,
                stroke: isHigher ? "rgba(200,0,0,0.1)" : "rgba(0,0,0,0.1)",
                "stroke-width": 10,
            },
            key: `${v}/${w}`,
            on: { click: () => console.log(v, w, labels) },
            style: {
                transition: "d 1s",
            },
        });
    }
    function circle(item) {
        let node = graph.node(item.id);
        let labels = node.labels;
        let methods = labels.map(nl => nl.label)
            .filter((label) => typeof label.kind !== "undefined" && label.kind === "observable");
        let text = methods.slice(-1).map((l) => `${l.method}(${l.args})`)[0] || node.name || item.id;
        let svg = snabbdom_1.h("circle", {
            attrs: {
                cx: mu + mu * item.x,
                cy: mu + mu * item.y,
                fill: colorIndex(parseInt(item.id, 10)),
                id: `circle-${item.id}`,
                r: 5,
                stroke: "black",
                "stroke-width": focusNodes.indexOf(item.id) >= 0 ? 1 : 0,
            },
            key: `circle-${item.id}`,
            on: { click: (e) => clicks.onNext(item.id) },
            style: { transition: "all 1s" },
        });
        let html = snabbdom_1.h("div", {
            attrs: { class: "graph-label" },
            key: `overlay-${item.id}`,
            on: { click: (e) => clicks.onNext(item.id) },
            style: {
                left: `${mu + mu * item.x}px`,
                top: `${mu + mu * item.y}px`,
                transition: "all 1s",
            },
        }, [snabbdom_1.h("span", text)]);
        // [
        //   h("rect", {
        //     attrs: {
        //       fill: "rgba(0,0,0,.75)",
        //       height: 20,
        //       id: `rect-${item.id}`,
        //       rx: 4,
        //       ry: 4,
        //       width: 30,
        //       x: mu + mu * item.x + 8,
        //       y: mu + mu * item.y - 10,
        //     },
        //     key: `rect-${item.id}`,
        //     style: { transition: "all 1s" },
        //   }),
        //   h("text", {
        //     attrs: {
        //       fill: "white",
        //       id: `text-${item.id}`,
        //       x: mu + mu * item.x + 10,
        //       y: mu + mu * item.y + 5,
        //     },
        //     key: `text-${item.id}`,
        //     style: { transition: "all 1s" },
        //   }, text),
        // ])
        return { html: [html], svg: [svg] };
    }
    let ns = l[0].nodes.map(circle);
    let elements = l
        .flatMap((level, levelIndex) => level.edges.map(edge))
        .concat(ns.flatMap(n => n.svg));
    let xmax = l
        .flatMap(level => level.nodes)
        .reduce((p, n) => Math.max(p, n.x), 0);
    let ymax = l
        .flatMap(level => level.nodes)
        .reduce((p, n) => Math.max(p, n.y), 0);
    let clicks = new Rx.Subject();
    let svg = snabbdom_1.h("svg", {
        attrs: {
            id: "structure",
            version: "1.1",
            xmlns: "http://www.w3.org/2000/svg",
        },
        style: {
            height: (ymax + 2) * mu,
            left: 0,
            position: "absolute",
            top: 0,
            width: (xmax + 2) * mu,
        },
    }, elements.concat(defs()));
    let mask = snabbdom_1.h("div", {
        attrs: {
            id: "structure-mask",
        },
        style: {
            height: (ymax + 2) * mu,
            position: "relative",
            width: (xmax + 2) * mu,
        },
    }, [svg].concat(ns.flatMap(n => n.html)));
    return {
        svg: mask,
        clicks,
    };
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
const defs = () => [snabbdom_1.h("defs", [
        snabbdom_1.h("filter", {
            attrs: { height: "200%", id: "dropshadow", width: "200%" },
        }, [
            snabbdom_1.h("feGaussianBlur", { attrs: { in: "SourceAlpha", stdDeviation: "2" } }),
            snabbdom_1.h("feOffset", { attrs: { dx: 0, dy: 0, result: "offsetblur" } }),
            snabbdom_1.h("feMerge", [
                snabbdom_1.h("feMergeNode"),
                snabbdom_1.h("feMergeNode", { attrs: { in: "SourceGraphic" } }),
            ]),
        ]),
        snabbdom_1.h("marker", {
            attrs: {
                id: "arrow",
                markerHeight: 10,
                markerUnits: "strokeWidth",
                markerWidth: 10,
                orient: "auto",
                overflow: "visible",
                refx: 0, refy: 3,
            },
        }, [snabbdom_1.h("path", { attrs: { d: "M-4,-2 L-4,2 L0,0 z", fill: "inherit" } })]),
        snabbdom_1.h("marker", {
            attrs: {
                id: "arrow-reverse",
                markerHeight: 10,
                markerUnits: "strokeWidth",
                markerWidth: 10,
                orient: "auto",
                overflow: "visible",
                refx: 0, refy: 3,
            },
        }, [snabbdom_1.h("path", { attrs: { d: "M0,0 L4,2 L4,-2 z", fill: "blue" } })]),
    ])];
//# sourceMappingURL=index.js.map