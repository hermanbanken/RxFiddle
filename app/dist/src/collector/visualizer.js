"use strict";
const color_1 = require("../color");
const layout_1 = require("../layout/layout");
require("../object/extensions");
require("../utils");
const grapher_1 = require("./grapher");
const graphutils_1 = require("./graphutils");
const graphlib_1 = require("graphlib");
const snabbdom = require("snabbdom");
const h_1 = require("snabbdom/h");
/* tslint:disable:no-var-requires */
const dagre = require("dagre");
const svgPanZoom = typeof window !== "undefined" ? require("svg-pan-zoom") : {};
const patch = snabbdom.init([
    require("snabbdom/modules/attributes"),
    require("snabbdom/modules/eventlisteners"),
]);
// const ErrorStackParser = require("error-stack-parser")
/* tslint:enable:no-var-requires */
const colors = color_1.generateColors(40);
function colorIndex(i) {
    if (typeof i === "undefined" || isNaN(i)) {
        return "transparent";
    }
    let [r, g, b] = colors[i % colors.length];
    return `rgb(${r},${g},${b})`;
}
window.colors = colors;
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
class Visualizer {
    constructor(collector, dom, controls) {
        this.metroLines = {};
        this.svgZoomInstance = null;
        this.showIdsBacking = false;
        this.componentId = 0;
        this.choices = [];
        this.rendered = 0;
        this.app = dom;
        this.controls = controls;
        this.collector = collector;
        this.grapher = new grapher_1.Grapher(collector);
        this.grapher.g.setGraph({});
        if (!!window) {
            window.alg = graphlib_1.alg;
            window.dagre = dagre;
            window.combined = this.grapher.combined;
            window.toDot = graphutils_1.toDot;
            window.rankLongestPath = graphutils_1.rankLongestPath;
        }
    }
    get showIds() {
        return this.showIdsBacking;
    }
    set showIds(value) {
        this.showIdsBacking = value;
        this.run();
    }
    get component() {
        return this.componentId;
    }
    set component(value) {
        this.componentId = value;
        this.choices = [];
        this.run();
    }
    structureDag() {
        return this.grapher.structureDag();
    }
    layout(graph = this.grapher.g) {
        graph.setGraph({});
        this.grapher.nodes.forEach(n => n.layout());
        dagre.layout(graph);
    }
    size(graph = this.grapher.g) {
        if (this.grapher.nodes.length === 0) {
            return { h: 10, w: 10 };
        }
        this.layout(graph);
        let g = graph.graph();
        return { h: g.height, w: g.width };
    }
    highlightSubscriptionSource(id, level = 1) {
        let sub = this.collector.getSubscription(id);
        if (typeof sub !== "undefined") {
            if (level < 0.1) {
                return;
            }
            sub.sinks.forEach(p => {
                this.highlightSubscriptionSource(p, level * 0.9);
                let parent = this.collector.getSubscription(p);
                let node = this.grapher.nodes[parent.observableId];
                if (node) {
                    node.setHighlightId(patch, parent.id);
                }
            });
        }
        else {
            this.grapher.nodes.forEach(n => { n.setHighlightId(patch); });
        }
    }
    render(graph) {
        this.rendered = this.collector.length;
        if (typeof graph === "undefined" || graph.nodes().length === 0) {
            return h_1.h("g");
        }
        this.layout(graph);
        let ns = graph.nodes().map((id) => this.grapher.node(id).render(patch, this.showIds))
            .reduce((p, c) => p.concat(c), []);
        let es = graph.edges().map((e) => {
            let edge = this.grapher.edge(e);
            return edge.render();
        });
        let childs = es.concat(ns);
        return h_1.h("g", { attrs: { class: "visualizer" } }, childs);
    }
    selection(graphs) {
        return [h_1.h("select", {
                on: {
                    change: (e) => {
                        console.log(e);
                        this.component = parseInt(e.target.value, 10);
                    },
                },
            }, graphs.map((g, i) => h_1.h("option", { attrs: { value: i } }, `graph ${i}`)))];
    }
    run() {
        if (this.app instanceof HTMLElement) {
            this.app.innerHTML = "";
        }
        let changes = this.grapher.process();
        /* Prepare components */
        let comps = graphlib_1.alg.components(this.grapher.dag);
        let graphs = comps
            .map(array => this.grapher.dag.filterNodes(n => array.indexOf(n) >= 0));
        let graph = graphs[this.component];
        patch(this.controls, this.selection(graphs)[0]);
        window.graph = graph;
        let render = this.render(graph);
        if (typeof graph !== "undefined") {
            this.size(graph);
        }
        let sg = new StructureGraph(this);
        let svg = sg.renderSvg(this.grapher.leveledGraph, this.choices, (v) => this.makeChoice(v, graph));
        let app = h_1.h("app", [
            h_1.h("master", svg.concat(sg.renderMarbles(graph, this.choices))),
            h_1.h("detail", [
                h_1.h("svg", {
                    attrs: {
                        id: "svg",
                        style: "width: 200px; height: 200px",
                        version: "1.1",
                        xmlns: "http://www.w3.org/2000/svg",
                    },
                }, [render].concat(defs())),
            ]),
        ]);
        patch(this.app, app);
        this.app = app;
        if (this.svgZoomInstance && changes) {
            this.svgZoomInstance.destroy();
        }
        if (typeof graph !== "undefined" && (!this.svgZoomInstance || changes)) {
            console.log("svgZoomInstance");
            this.svgZoomInstance = svgPanZoom("#svg", { maxZoom: 30 });
        }
    }
    makeChoice(v, graph) {
        let node = graph.node(v);
        console.log(v, graph, node);
        let newChoices = this.choices;
        graph.predecessors(v).flatMap(p => this.descendants(graph, p)).forEach(n => {
            let index = newChoices.findIndex(c => c === n);
            if (index >= 0) {
                newChoices.splice(index, 1);
            }
        });
        newChoices.push(v);
        this.choices = newChoices;
        this.run();
    }
    descendants(graph, v) {
        if (!graphlib_1.alg.isAcyclic(graph)) {
            throw new Error("Only use this on acyclic graphs!");
        }
        let sc = graph.successors(v);
        return sc.concat(sc.flatMap(s => this.descendants(graph, s)));
    }
    attach(node) {
        this.app = node;
        this.step();
    }
    step() {
        window.requestAnimationFrame(() => this.step());
        if (this.rendered === this.collector.length) {
            return;
        }
        this.run();
    }
}
exports.Visualizer = Visualizer;
class StructureGraph {
    constructor(visualizer) {
        // intentionally left blank
        this.visualizer = visualizer;
    }
    static traverse(graph, choices = []) {
        if (typeof graph === "undefined") {
            return [];
        }
        let path = [];
        let sources = graph.sources();
        do {
            // select first from choices or from successors otherwise
            let current = sources.find(source => choices.indexOf(source) >= 0) || sources[0];
            path.unshift(current);
            sources = graph.successors(current);
        } while (sources.length);
        return path.reverse();
    }
    static branches(graph, node, choices) {
        if (typeof graph === "undefined") {
            return [];
        }
        let successors = graph.successors(node);
        let chosen = successors.find(n => choices.indexOf(n) >= 0) || successors[0];
        return successors.filter(s => s !== chosen);
    }
    renderMarbles(graph, choices) {
        let coordinator = new MarbleCoordinator();
        let u = StructureGraph.chunk;
        let main = StructureGraph.traverse(graph, choices);
        main.forEach((v) => coordinator.add(graph.node(v)));
        let root = h_1.h("div", {
            attrs: {
                id: "marbles",
                style: `width: ${u * 2}px; height: ${u * (0.5 + main.length)}px`,
            },
        }, main.flatMap((v, i) => {
            let clazz = "operator " + (typeof graph.node(v).locationText !== "undefined" ? "withStack" : "");
            let box = h_1.h("div", { attrs: { class: clazz } }, [
                h_1.h("div", [], graph.node(v).name),
                h_1.h("div", [], graph.node(v).locationText),
            ]);
            return [box, coordinator.render(graph.node(v))];
        }));
        return [root];
    }
    renderSvg(graph, choices, cb) {
        let u = StructureGraph.chunk;
        window.renderSvgGraph = graph;
        let layout = layout_1.default(graph);
        let mu = u / 2;
        let elements = layout.flatMap((level, levelIndex) => {
            let edges = level.edges.map(({ v, w, points }) => {
                let path = points.map(({ x, y }) => `${mu + mu * x} ${mu + mu * y}`).join(" L ");
                return h_1.h("path", {
                    attrs: {
                        d: `M${path}`,
                        stroke: levelIndex === 0 ? "rgba(0,0,0,0.1)" : "gray",
                        // "stroke-dasharray": 5,
                        "stroke-width": levelIndex === 0 ? 10 : 2,
                    },
                    on: { mouseover: () => console.log(graph.edge(v, w)) },
                });
            });
            return edges;
        }).concat(layout[0].nodes.map(item => h_1.h("circle", {
            attrs: {
                cx: mu + mu * item.x,
                cy: mu + mu * item.y,
                fill: colorIndex(parseInt(item.id, 10)),
                id: `circle-${item.id}`,
                r: 5,
            },
            on: {
                click: (e) => console.log(item.id, this.visualizer.collector.data[parseInt(item.id, 10)]),
            },
        })));
        // commented 2017-01-13 friday 9:50 
        // let ranked = rankLongestPathGraph(graph
        //   // .filterEdges(v => v.w < v.v)
        //   .filterNodes((_, n) => n.level === "observable")
        // )
        // let rootLayout = structureLayout(ranked)
        // let fullLayout = rootLayout.layout //this.superImpose(rootLayout, graph)
        let g = graph
            .filterEdges(v => v.w < v.v)
            .filterNodes((_, n) => n.level === "subscription");
        let xmax = layout
            .flatMap(level => level.nodes)
            .reduce((p, n) => Math.max(p, n.x), 0);
        return [h_1.h("svg", {
                attrs: {
                    id: "structure",
                    style: `width: ${xmax * u}px; height: ${u * (0.5 + elements.length)}px`,
                    version: "1.1",
                    xmlns: "http://www.w3.org/2000/svg",
                },
            }, elements)];
    }
    superImpose(root, g) {
        // TODO
        let layout = root.layout.flatMap(item => {
            let subs = g.outEdges(item.node)
                .flatMap(e => typeof g.edge(e) === "object" && g.edge(e).lower === "subscription" ? [e.w] : []);
            console.log("subs", subs);
            if (subs.length) {
                return subs.map((sub, index) => Object.assign({}, item, {
                    node: sub,
                    x: item.x + (index / subs.length - 0.5)
                })).concat([item]);
            }
            else {
                return [item];
            }
        });
        return layout;
    }
}
StructureGraph.chunk = 100;
class MarbleCoordinator {
    add(node) {
        let times = node.observers.flatMap(v => v[2]).map(e => e.time);
        this.min = times.reduce((m, n) => typeof m !== "undefined" ? Math.min(m, n) : n, this.min);
        this.max = times.reduce((m, n) => typeof m !== "undefined" ? Math.max(m, n) : n, this.max);
    }
    render(node) {
        let events = node.observers.flatMap(v => v[2]);
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
//# sourceMappingURL=visualizer.js.map