"use strict";
require("../object/extensions");
require("../utils");
const edge_1 = require("./edge");
const logger_1 = require("./logger");
const node_1 = require("./node");
const typedgraph_1 = require("./typedgraph");
const graphlib_1 = require("graphlib");
class Grapher {
    constructor(collector) {
        this.edges = [];
        this.nodes = [];
        this.g = new typedgraph_1.default("g", { compound: true, multigraph: true });
        this.dag = new typedgraph_1.default("dag", { compound: true, multigraph: true });
        this.combined = new typedgraph_1.default("combined", { compound: true, multigraph: true });
        this.metroLines = {};
        this.svgZoomInstance = null;
        this.leveledGraph = new typedgraph_1.default();
        this.processed = 0;
        this.g.setGraph({});
        this.collector = collector;
    }
    structureDag() {
        return this.g.filterEdges((_, obj) => obj.type === "structure");
    }
    handleLogEntry(el) {
        //
        // StackFrame
        //
        if (el instanceof logger_1.AddStackFrame) {
            this.leveledGraph.setNode(`${el.id}`, {
                hierarchicOrder: [],
                id: `${el.id}`,
                level: "code",
                payload: el.stackframe,
            });
            if (typeof el.parent !== "undefined") {
                let parent = this.collector.getStack(el.parent);
                this.handleLogEntry(parent);
                this.leveledGraph.setEdge(`${parent.id}`, `${el.id}`);
            }
        }
        //
        // Observable
        //
        if (el instanceof logger_1.AddObservable) {
            if (typeof el.callParent !== "undefined") {
            }
            let node = this.setNode(el.id, new node_1.RxFiddleNode(`${el.id}`, el.method || "", this.collector.getStack(el.stack) && this.collector.getStack(el.stack).stackframe));
            this.leveledGraph.setNode(`${el.id}`, {
                hierarchicOrder: [el.stack],
                id: `${el.id}`,
                level: "observable",
                payload: el,
            });
            if (typeof el.stack !== "undefined") {
                this.leveledGraph.setEdge(`${el.stack}`, `${el.id}`, {
                    lower: "observable",
                    upper: "code",
                });
            }
            node.addObservable(el);
            for (let p of el.parents.filter(_ => typeof _ !== "undefined")) {
                let edge = new edge_1.RxFiddleEdge(this.nodes[p], this.nodes[el.id], "structure", {
                    "marker-end": "url(#arrow)",
                });
                this.setEdge(p, el.id, edge);
                this.leveledGraph.setEdge(`${p}`, `${el.id}`);
                let parent = this.collector.getObservable(p);
                if (typeof parent.stack !== "undefined" && typeof el.stack !== "undefined") {
                    this.incrementDown(parent.stack, el.stack);
                }
            }
        }
        //
        // Subscription
        //
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
            this.leveledGraph.setNode(`${el.id}`, {
                hierarchicOrder: [
                    this.collector.getObservable(adds.observableId).stack,
                    adds.observableId,
                ],
                id: `${el.id}`,
                level: "subscription",
                payload: el,
            });
            this.leveledGraph.setEdge(`${adds.observableId}`, `${adds.id}`, {
                lower: "subscription",
                upper: "observable",
            });
            adds.sinks.forEach((sinkId) => {
                let to = this.collector.getSubscription(sinkId).observableId;
                let toNode = this.nodes[this.collector.getSubscription(sinkId).observableId];
                if (!this.edgeExists(from, to)) {
                    this.setEdge(to, from, new edge_1.RxFiddleEdge(node, toNode, "subscription", {
                        dashed: true,
                        stroke: "blue",
                        "marker-start": "url(#arrow-reverse)",
                    }));
                }
                else {
                    let existing = this.edge(from, to);
                    existing.options.stroke = "purple";
                    existing.options["marker-start"] = "url(#arrow-reverse)";
                }
                this.leveledGraph.setEdge(`${el.id}`, `${sinkId}`);
                this.incrementDown(adds.observableId, to);
            });
            // Dashed link
            if (typeof adds.scopeId !== "undefined") {
                let toId = (this.collector.getSubscription(adds.scopeId)).observableId;
                let to = this.nodes[(this.collector.getSubscription(adds.scopeId)).observableId];
                this.setEdge(toId, from, new edge_1.RxFiddleEdge(to, node, "higherorder", {
                    dashed: true,
                    "marker-end": "url(#arrow)",
                }));
                this.leveledGraph.setEdge(`${adds.scopeId}`, `${adds.id}`);
                this.incrementDown(toId, adds.observableId);
            }
        }
        //
        // Event
        //
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
        let start = this.processed;
        this.processed = this.collector.length;
        for (let i = start; i < this.collector.length; i++) {
            let el = this.collector.getLog(i);
            this.handleLogEntry(el);
        }
        return this.collector.length - start;
    }
    descendants(graph, v) {
        if (!graphlib_1.alg.isAcyclic(graph)) {
            throw new Error("Only use this on acyclic graphs!");
        }
        let sc = graph.successors(v);
        return sc.concat(sc.flatMap(s => this.descendants(graph, s)));
    }
    setNode(id, label) {
        this.nodes[id] = label;
        this.g.setNode(`${id}`, label);
        return label;
    }
    edgeExists(from, to) {
        return typeof this.g.edge(`${from}`, `${to}`) !== "undefined";
    }
    setEdge(from, to, edge) {
        if (edge.type === "structure") {
            this.dag.setNode(from.toString(10), edge.from);
            this.dag.setNode(to.toString(10), edge.to);
            this.dag.setEdge(from.toString(10), to.toString(10), edge);
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
    incrementDown(from, to) {
        if (typeof from === "undefined" || typeof to === "undefined") {
            return;
        }
        // let edge: ShadowEdge = this.leveledGraph.edge(`${from}`, `${to}`) as ShadowEdge
        // if (typeof edge === "undefined") {
        //   edge = { count: 0, shadow: true }
        //   this.leveledGraph.setEdge(`${from}`, `${to}`, edge)
        // }
        // edge.count = typeof edge.count === "number" ? edge.count + 1 : 1
    }
}
exports.Grapher = Grapher;
//# sourceMappingURL=grapher.js.map