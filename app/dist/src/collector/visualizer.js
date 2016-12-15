"use strict";
require("../utils");
const edge_1 = require("./edge");
const graphutils_1 = require("./graphutils");
const logger_1 = require("./logger");
const node_1 = require("./node");
const graphlib_1 = require("graphlib");
const snabbdom = require("snabbdom");
require("../utils");
require("../object/extensions");
/* tslint:disable:no-var-requires */
const dagre = require("dagre");
const svgPanZoom = typeof window !== "undefined" ? require("svg-pan-zoom") : {};
const h = require("snabbdom/h");
const patch = snabbdom.init([
    require("snabbdom/modules/attributes"),
    require("snabbdom/modules/eventlisteners"),
]);
// const ErrorStackParser = require("error-stack-parser")
/* tslint:enable:no-var-requires */
const colors = ["#0066B9", "#E90013", "#8E4397", "#3FB132", "#FDAC00", "#F3681B", "#9FACB3", "#9CA2D4", "#E84CA2"];
function colorIndex(i) {
    return colors[i % colors.length];
}
function toDot(graph) {
    return "graph g {\n" +
        this.visualizer.subs.edges().map((e) => e.v + " -- " + e.w + " [type=s];").join("\n") +
        "\n}";
}
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
exports.HASH = "__hash";
exports.IGNORE = "__ignore";
class Visualizer {
    constructor(collector, dom, controls) {
        this.edges = [];
        this.nodes = [];
        this.g = new graphlib_1.Graph({ compound: true, multigraph: true });
        this.dag = new graphlib_1.Graph({ compound: true, multigraph: true });
        this.combined = new graphlib_1.Graph({ compound: true, multigraph: true });
        this.metroLines = {};
        this.svgZoomInstance = null;
        this.showIdsBacking = false;
        this.componentId = 0;
        this.choices = [];
        this.rendered = 0;
        this.g.setGraph({});
        this.app = dom;
        this.controls = controls;
        this.collector = collector;
        if (!!window) {
            window.alg = graphlib_1.alg;
            window.dagre = dagre;
            window.combined = this.combined;
            window.toDot = toDot;
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
        let edges = this.g.edges();
        let clone = new graphlib_1.Graph();
        edges.forEach(({ v, w }) => {
            let edge = this.g.edge({ v, w });
            if (edge.type !== "structure") {
                return;
            }
            console.log(edge, v, w);
            edge.from = this.g.node(v);
            edge.to = this.g.node(w);
            clone.setNode(v, this.g.node(v));
            clone.setNode(w, this.g.node(w));
            clone.setEdge(v, w, edge);
        });
        return (clone);
    }
    layout(graph = this.g) {
        graph.setGraph({});
        this.nodes.forEach(n => n.layout());
        dagre.layout(graph);
    }
    size(graph = this.g) {
        if (this.nodes.length === 0) {
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
                let node = this.nodes[parent.observableId];
                if (node) {
                    node.setHighlightId(patch, parent.id);
                }
            });
        }
        else {
            this.nodes.forEach(n => { n.setHighlightId(patch); });
        }
    }
    // public metroData(): { obs: string[], subs: string[], color: string }[] {
    //   return Object.values(this.metroLines).map((line: number[], index: number) => ({
    //     color: colorIndex(index),
    //     obs: line.map((subId: number) => this.collector.getSubscription(subId).observableId).map(s => s.toString()),
    //     subs: line,
    //   }))
    // }
    handleLogEntry(el) {
        if (el instanceof logger_1.AddObservable) {
            if (typeof el.callParent !== "undefined") {
            }
            let node = this.setNode(el.id, new node_1.RxFiddleNode(`${el.id}`, el.method, this.collector.getStack(el.stack) && this.collector.getStack(el.stack).stackframe, this));
            node.addObservable(el);
            for (let p of el.parents.filter(_ => typeof _ !== "undefined")) {
                // typeof this.nodes[p] === "undefined" && console.warn(p, "node is undefined, to", el.id)
                let edge = new edge_1.RxFiddleEdge(this.nodes[p], this.nodes[el.id], "structure", {
                    "marker-end": "url(#arrow)",
                });
                this.setEdge(p, el.id, edge);
            }
        }
        if (logger_1.instanceAddSubscription(el) && typeof this.nodes[el.observableId] !== "undefined") {
            let adds = el;
            // subs-graph
            this.combined.setNode(`${adds.id}`, el);
            adds.sinks.forEach(s => this.combined.setEdge(`${adds.id}`, `${s}`));
            let node = this.nodes[adds.observableId];
            let from = adds.observableId;
            node.addObserver(this.collector.getObservable(adds.observableId), adds);
            // add metro lines
            if (adds.sinks.length > 0) {
                this.metroLines[adds.id] = (this.metroLines[adds.sinks[0]] || [adds.sinks[0]]).concat([adds.id]);
                delete this.metroLines[adds.sinks[0]];
            }
            else {
                this.metroLines[adds.id] = [adds.id];
            }
            adds.sinks.forEach((parentId) => {
                let to = this.collector.getSubscription(parentId).observableId;
                let toNode = this.nodes[this.collector.getSubscription(parentId).observableId];
                let existing = this.edge(from, to);
                if (typeof existing === "undefined") {
                    this.setEdge(to, from, new edge_1.RxFiddleEdge(node, toNode, "subscription", {
                        dashed: true,
                        stroke: "blue",
                        "marker-start": "url(#arrow-reverse)",
                    }));
                }
                else if (existing instanceof edge_1.RxFiddleEdge) {
                    existing.options.stroke = "purple";
                    existing.options["marker-start"] = "url(#arrow-reverse)";
                }
                else {
                    console.warn("What edge?", existing);
                }
            });
            // Dashed link
            if (typeof adds.scopeId !== "undefined") {
                let toId = (this.collector.getSubscription(adds.scopeId)).observableId;
                let to = this.nodes[(this.collector.getSubscription(adds.scopeId)).observableId];
                this.setEdge(toId, from, new edge_1.RxFiddleEdge(to, node, "higherorder", {
                    dashed: true,
                    "marker-end": "url(#arrow)",
                }));
            }
        }
        if (el instanceof logger_1.AddEvent && typeof this.collector.getSubscription(el.subscription) !== "undefined") {
            let oid = (this.collector.getSubscription(el.subscription)).observableId;
            if (typeof this.nodes[oid] === "undefined") {
                return;
            }
            for (let row of this.nodes[oid].observers) {
                if (row[1].id === el.subscription) {
                    row[2].push(el.event);
                }
            }
        }
    }
    process() {
        this.g.graph().ranker = "tight-tree";
        // this.g.graph().rankdir = "RL"
        let start = this.rendered;
        this.rendered = this.collector.length;
        for (let i = start; i < this.collector.length; i++) {
            let el = this.collector.getLog(i);
            this.handleLogEntry(el);
        }
        return this.collector.length - start;
    }
    render(graph) {
        this.rendered = this.collector.length;
        if (typeof graph === "undefined" || graph.nodes().length === 0) {
            return h("g");
        }
        this.layout(graph);
        let ns = graph.nodes().map((id) => this.node(id).render(patch, this.showIds))
            .reduce((p, c) => p.concat(c), []);
        let es = graph.edges().map((e) => {
            let edge = this.edge(e);
            return edge.render();
        });
        let childs = es.concat(ns);
        return h("g", { attrs: { class: "visualizer" } }, childs);
    }
    selection(graphs) {
        return [h("select", {
                on: {
                    change: (e) => { console.log(e); this.component = parseInt(e.target.value, 10); },
                },
            }, graphs.map((g, i) => h("option", { attrs: { value: i } }, `graph ${i}`)))];
    }
    run() {
        if (this.app instanceof HTMLElement) {
            this.app.innerHTML = "";
        }
        let changes = this.process();
        /* Prepare components */
        let comps = graphlib_1.alg.components(this.dag);
        let graphs = comps.map(array => this.dag.filterNodes(n => array.indexOf(n) >= 0));
        let graph = graphs[this.component];
        patch(this.controls, this.selection(graphs)[0]);
        window.graph = graph;
        console.log(StructureGraph.traverse(graph), this.choices);
        console.log("choices", this.choices);
        let render = this.render(graph);
        if (typeof graph !== "undefined") {
            this.size(graph);
        }
        let sg = new StructureGraph();
        let app = h("app", [
            h("master", sg.renderSvg(graph, this.choices, (v) => this.makeChoice(v, graph), this.dag, Object.values(this.metroLines)).concat(sg.renderMarbles(graph, this.choices))),
            h("detail", [
                h("svg", {
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
    setNode(id, label) {
        this.nodes[id] = label;
        this.g.setNode(`${id}`, label);
        return label;
    }
    setEdge(from, to, edge) {
        if (edge.type === "structure") {
            this.dag.setNode(`${from}`, this.nodes[from]);
            this.dag.setNode(`${to}`, this.nodes[to]);
            this.dag.setEdge(`${from}`, `${to}`, edge);
        }
        this.g.setEdge(`${from}`, `${to}`, edge);
        this.edges.push(edge);
    }
    edge(from, to) {
        let edge;
        if (typeof from === "number") {
            edge = this.g.edge(`${from}`, `${to}`);
        }
        else {
            edge = this.g.edge(from);
        }
        return typeof edge !== "undefined" ? edge : undefined;
    }
    node(label) {
        return this.nodes[typeof label === "number" ? label : parseInt(label, 10)];
    }
}
exports.Visualizer = Visualizer;
class StructureGraph {
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
        main.map((v) => graph.node(v)).forEach(v => coordinator.add(v));
        let root = h("div", {
            attrs: {
                id: "marbles",
                style: `width: ${u * 2}px; height: ${u * (0.5 + main.length)}px`,
            },
        }, main.flatMap((v, i) => {
            let clazz = "operator " + (typeof graph.node(v).locationText !== "undefined" ? "withStack" : "");
            let box = h("div", { attrs: { class: clazz } }, [
                h("div", [], graph.node(v).name),
                h("div", [], graph.node(v).locationText),
            ]);
            return [box, coordinator.render(graph.node(v))];
        }));
        return [root];
    }
    renderSvg(graph, choices, cb, dag, lines) {
        let u = StructureGraph.chunk;
        window.renderSvgGraph = graph;
        let mu = u / 2;
        let structure = graphutils_1.structureLayout(graph);
        let structureIndex = graphutils_1.indexedBy(i => i.node, structure.layout);
        console.log("structure layout", structure);
        let nodes = structure.layout /*.filter(item => !item.isDummy)*/.flatMap((item, i) => {
            return [h("circle", {
                    attrs: {
                        cx: mu + mu * item.x,
                        cy: mu + mu * item.y,
                        fill: colorIndex(item.isDummy ? 1 : 0),
                        r: item.isDummy ? 2 : 5
                    },
                    on: {
                        click: () => console.log(item),
                    },
                }), h("text", { attrs: { x: mu + mu * item.x + 10, y: mu + mu * item.y + 5 } }, item.isDummy ? "" : `${item.node}`)];
        });
        let edges = structure.graph.edges().map(g => {
            let v = structureIndex[g.v];
            let w = structureIndex[g.w];
            if (!v || !w)
                console.log(g, v, w);
            return h("path", {
                attrs: { d: `M${mu + mu * v.x} ${mu + mu * v.y} L ${mu + mu * w.x} ${mu + mu * w.y}`,
                    stroke: "gray", "stroke-dasharray": 5 },
            });
        });
        return [h("svg", {
                attrs: {
                    id: "structure",
                    style: `width: ${u * 6}px; height: ${u * (0.5 + structure.layout.length)}px`,
                    version: "1.1",
                    xmlns: "http://www.w3.org/2000/svg",
                },
            }, edges.concat(nodes))];
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
        let marbles = events.map(e => h("svg", {
            attrs: { x: `${this.relTime(e.time)}%`, y: "50%" },
        }, [h("path", {
                attrs: { class: "arrow", d: "M 0 -50 L 0 48" },
            }), h("circle", {
                attrs: { class: e.type, cx: 0, cy: 0, r: 8 },
            })]));
        return h("svg", {
            attrs: {
                class: "marblediagram",
            },
        }, [
            h("line", { attrs: { class: "time", x1: "0", x2: "100%", y1: "50%", y2: "50%" } }),
        ].concat(marbles).concat(defs()));
    }
    relTime(t) {
        return (t - this.min) / (this.max - this.min) * 95 + 2.5;
    }
}
//# sourceMappingURL=visualizer.js.map