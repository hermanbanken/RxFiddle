"use strict";
const graphutils_1 = require("../collector/graphutils");
const typedgraph_1 = require("../collector/typedgraph");
const color_1 = require("../color");
require("../object/extensions");
require("../utils");
const layout_1 = require("./layout");
const marbles_1 = require("./marbles");
const morph_1 = require("./morph");
const Rx = require("rx");
const snabbdom_1 = require("snabbdom");
const attributes_1 = require("snabbdom/modules/attributes");
const class_1 = require("snabbdom/modules/class");
const eventlisteners_1 = require("snabbdom/modules/eventlisteners");
const style_1 = require("snabbdom/modules/style");
const patch = snabbdom_1.init([class_1.default, attributes_1.default, style_1.default, eventlisteners_1.default, morph_1.default]);
class Grapher {
    constructor(collector) {
        // this.viewState = viewState.startWith(emptyViewState)
        this.graph = collector.dataObs
            .scan(grapherNext, {
            main: new typedgraph_1.default(),
            subscriptions: new typedgraph_1.default(),
        });
        // .combineLatest(this.viewState, this.filter)
    }
}
exports.Grapher = Grapher;
function setEdge(v, w, graph, nodeCreate, value) {
    v = `${v}`;
    w = `${w}`;
    if (!graph.hasNode(v)) {
        graph.setNode(v, nodeCreate());
    }
    if (!graph.hasNode(w)) {
        graph.setNode(w, nodeCreate());
    }
    graph.setEdge(v, w, value);
}
function grapherNext(graphs, event) {
    let { main, subscriptions } = graphs;
    switch (event.type) {
        case "node":
            main.setNode(`${event.id}`, {
                labels: [],
                name: event.node.name,
            });
            break;
        case "edge":
            let e = main.edge(`${event.edge.v}`, `${event.edge.w}`) || {
                labels: [],
            };
            e.labels.push(event);
            let edgeLabel = event.edge.label;
            if (edgeLabel.type === "subscription sink") {
                setEdge(edgeLabel.v, edgeLabel.w, subscriptions, () => ({}));
            }
            setEdge(event.edge.v, event.edge.w, main, () => ({}), e);
            break;
        case "label":
            (main.node(`${event.node}`) || main.node(`${event.label.subscription}`)).labels.push(event);
            let label = event.label;
            if (label.type === "subscription") {
                subscriptions.setNode(label.id.toString(10), event.node);
            }
            break;
        default: break;
    }
    ;
    window.graph = graph;
    return { main, subscriptions };
}
exports.grapherNext = grapherNext;
class Visualizer {
    constructor(grapher, dom, controls) {
        // TODO workaround for Rx.Subject's
        this.focusNodes = new Rx.Subject();
        this.openGroups = new Rx.Subject();
        this.grapher = grapher;
        this.app = dom;
        let inp = grapher.graph
            .debounce(10)
            .combineLatest(this.viewState, (graphs, state) => {
            let filtered = this.filter(graphs, state);
            return ({
                graphs: filtered,
                layout: layout_1.default(filtered.main, state.focusNodes),
                viewState: state,
            });
        });
        let { svg, clicks, groupClicks } = graph$(inp);
        this.DOM = svg;
        this.clicks = clicks;
        this.groupClicks = groupClicks;
    }
    get viewState() {
        return this.focusNodes.startWith([]).combineLatest(this.openGroups.startWith([]), (fn, og) => ({
            focusNodes: fn,
            openGroups: og,
            openGroupsAll: false,
        }));
    }
    run() {
        this.DOM
            .subscribe(d => this.app = patch(this.app, d));
        this.clicks
            .scan((list, n) => list.indexOf(n) >= 0 ? list.filter(i => i !== n) : list.concat([n]), [])
            .startWith([])
            .subscribe(this.focusNodes);
        this.groupClicks
            .scan((list, n) => list.indexOf(n) >= 0 ? list.filter(i => i !== n) : list.concat([n]), [])
            .startWith([])
            .subscribe(this.openGroups);
    }
    attach(node) {
        this.app = node;
        this.step();
    }
    step() {
        this.run();
    }
    filter(graphs, viewState) {
        return {
            main: graphs.main.filterNodes((id, node) => {
                let annotations = (node ? node.labels || [] : [])
                    .filter(ann => ann.label.type === "observable");
                if (annotations.length === 0) {
                    return true;
                }
                return annotations
                    .some(ann => !ann.groups.length || ann.groups.slice(-1).some(g => viewState.openGroups.indexOf(`${g}`) >= 0));
                // let groups = node.labels.flatMap(l => l.groups && l.groups.slice(-1) || [])
                // if (groups && groups.length > 0) {
                //   console.log("groups", groups, "testing", groups.slice(-1)
                //     .find(g => viewState.openGroups.indexOf(`${g}`) >= 0))
                // }
                // return viewState.openGroupsAll ||
                //   !groups ||
                //   groups.length === 0 ||
                //   (groups.find(g => viewState.openGroups.indexOf(`${g}`) >= 0) && true)
            }),
            subscriptions: graphs.subscriptions,
        };
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Visualizer;
function graph$(inp) {
    let result = inp.map(data => {
        return graph(data.layout, data.viewState, data.graphs);
    }).publish().refCount();
    return {
        clicks: result.flatMap(_ => _.clicks),
        groupClicks: result.flatMap(_ => _.groupClicks),
        svg: result.map(_ => _.svg),
    };
}
const u = 100;
const mu = u / 2;
// tslint:disable-next-line:no-unused-variable
function spath(ps) {
    return "M" + ps.map(({ x, y }) => `${mu + mu * x} ${mu + mu * y}`).join(" L ");
}
function bpath(ps) {
    let last = ps[ps.length - 1];
    return "M " + mapTuples(ps, (a, b) => `${mu + mu * a.x} ${mu + mu * a.y} C ${mu * (1 + a.x)} ${mu * (1.5 + a.y)}, ${mu + mu * b.x} ${mu * (0.5 + b.y)}, `).join("") + ` ${mu + mu * last.x} ${mu + mu * last.y}`;
}
function mapTuples(list, f) {
    let result = [];
    for (let i = 1, ref = i - 1; i < list.length; i++, ref++) {
        result.push(f(list[ref], list[i], ref, i));
    }
    return result;
}
exports.mapTuples = mapTuples;
function graph(layout, viewState, graphs) {
    console.log("Layout", layout);
    let graph = graphs.main;
    // Collect clicks in Subject
    let clicks = new Rx.Subject();
    let groupClicks = new Rx.Subject();
    function edge(edge) {
        let { v, w, points } = edge;
        let labels = (graph.edge(v, w) || { labels: [] }).labels;
        let isHigher = labels.map(_ => _.edge.label).map((_) => _.type).indexOf("higherOrderSubscription sink") >= 0;
        return snabbdom_1.h("path", {
            attrs: {
                d: bpath(points),
                fill: "transparent",
                id: `${v}/${w}`,
                stroke: isHigher ? "rgba(200,0,0,0.1)" : "rgba(0,0,0,0.1)",
                "stroke-width": 10,
            },
            hook: { prepatch: morph_1.default.prepare },
            key: `${v}/${w}`,
            on: { click: () => console.log(v, w, labels) },
            style: {
                transition: "d 1s",
            },
        });
    }
    function circle(item) {
        let node = graph.node(item.id);
        let labels = node.labels || [];
        let methods = labels.map(nl => nl.label)
            .filter(label => label.type === "observable")
            .reverse();
        let text = methods.map((l) => `${l.method}(${l.args})`).join(", ") || node.name || item.id;
        // tslint:disable-next-line:no-unused-variable
        let shade = snabbdom_1.h("circle", {
            attrs: {
                cx: mu + mu * item.x,
                cy: mu + mu * item.y + 1,
                fill: "rgba(0,0,0,.3)",
                r: 5,
            },
            key: `circle-shade-${item.id}`,
            style: { transition: "all 1s" },
        });
        let circ = snabbdom_1.h("circle", {
            attrs: {
                cx: mu + mu * item.x,
                cy: mu + mu * item.y,
                fill: colorIndex(parseInt(item.id, 10)),
                id: `circle-${item.id}`,
                r: 5,
                stroke: "black",
                "stroke-width": viewState.focusNodes.indexOf(item.id) >= 0 ? 1 : 0,
            },
            key: `circle-${item.id}`,
            on: {
                click: (e) => clicks.onNext(item.id),
                mouseover: (e) => console.log(item.id, labels),
            },
            style: { transition: "all 1s" },
        });
        let svg = [/*shade, */ circ];
        let html = snabbdom_1.h("div", {
            attrs: { class: "graph-label" },
            key: `overlay-${item.id}`,
            on: {
                click: (e) => clicks.onNext(item.id),
                mouseover: (e) => console.log(item.id, labels),
            },
            style: {
                left: `${mu + mu * item.x}px`,
                top: `${mu + mu * item.y}px`,
                transition: "all 1s",
            },
        }, [snabbdom_1.h("span", text)]);
        return { html: [html], svg };
    }
    // groups
    let grouped = graphutils_1.groupBy(n => n.group, layout[0].nodes
        .flatMap(node => (graph.node(node.id).labels || [])
        .flatMap(_ => _.groups)
        .filter(_ => typeof _ === "number")
        .map(group => ({ node, group }))));
    let groups = Object.keys(grouped).map(k => ({ group: grouped[k], key: k }));
    let gps = groups
        .flatMap(({ group, key }, index) => group.map(_ => _.node).map(({ x, y }) => snabbdom_1.h("circle", {
        attrs: {
            cx: mu + mu * x,
            cy: mu + mu * y,
            fill: colorIndex(parseInt(key, 10), .3),
            id: `group-${key}`,
            r: mu / 4,
        },
        key: `group-${key}`,
        style: {
            transition: "all 1s",
        },
    })));
    let ns = layout[0].nodes.map(circle);
    let elements = [
        snabbdom_1.h("g", gps),
        snabbdom_1.h("g", layout.flatMap((level, levelIndex) => level.edges.map(edge)).sort(vnodeSort)),
        snabbdom_1.h("g", ns.flatMap(n => n.svg).sort(vnodeSort)),
    ];
    // Calculate SVG bounds
    let xmax = layout
        .flatMap(level => level.nodes)
        .reduce((p, n) => Math.max(p, n.x), 0);
    let ymax = layout
        .flatMap(level => level.nodes)
        .reduce((p, n) => Math.max(p, n.y), 0);
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
            height: `${(ymax + 2) * mu}px`,
            position: "relative",
            width: `${(xmax + 2) * mu}px`,
        },
    }, [svg].concat(ns.flatMap(n => n.html)));
    let controls = snabbdom_1.h("div", [
        snabbdom_1.h("div", ["Groups: ", ...groups.flatMap(g => [snabbdom_1.h("span", {
                    on: { click: () => groupClicks.onNext(g.key) },
                }, g.key), ", "])]),
        snabbdom_1.h("div", ["Open groups: ", ...viewState.openGroups.flatMap(key => [snabbdom_1.h("span", key), ", "])]),
    ]);
    let panel = snabbdom_1.h("div", [controls, mask]);
    let diagram = [snabbdom_1.h("div")];
    if (viewState.focusNodes.length) {
        let subIds = graph.node(viewState.focusNodes[0])
            .labels
            .map(l => l.label)
            .flatMap(l => l.type === "subscription" ? [l.id] : []);
        let subId = subIds[0];
        // tslint:disable-next-line:max-line-length
        let inn = collect(subId.toString(10), w => graphs.subscriptions.hasNode(w) ? graphs.subscriptions.inEdges(w).map(e => e.v) : []);
        let out = collect(subId.toString(10), v => graphs.subscriptions.hasNode(v) ? graphs.subscriptions.outEdges(v).map(e => e.w) : []);
        let path = inn.reverse().concat([`${subId}`]).concat(out);
        let input = path.map(v => graphs.main.node(graphs.main.hasNode(v) ? v : `${graphs.subscriptions.node(v)}`));
        diagram = renderMarbles(input);
    }
    let app = snabbdom_1.h("app", [
        snabbdom_1.h("master", panel),
        snabbdom_1.h("detail", diagram),
    ]);
    return {
        svg: app,
        clicks,
        groupClicks,
    };
}
function collect(start, f) {
    return f(start).flatMap(n => [n].concat(collect(n, f)));
}
const colors = color_1.generateColors(40);
function colorIndex(i, alpha = 1) {
    if (typeof i === "undefined" || isNaN(i)) {
        return "transparent";
    }
    let [r, g, b] = colors[i % colors.length];
    return alpha === 1 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${alpha})`;
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
function vnodeSort(vna, vnb) {
    return vna.key.toString().localeCompare(vnb.key.toString());
}
function renderMarbles(nodes) {
    let coordinator = new marbles_1.MarbleCoordinator();
    let all_events = nodes.flatMap(n => n.labels).map(l => l.label).flatMap(l => l.type === "event" ? [l] : []);
    coordinator.add(all_events);
    console.log("All events", all_events);
    let root = snabbdom_1.h("div", {
        attrs: {
            id: "marbles",
            style: `min-width: ${u * 2}px; height: ${u * (1.5 * nodes.length)}px`,
        },
    }, nodes.flatMap((node, i) => {
        let obs = node.labels.map(_ => _.label).reverse().find(_ => _.type === "observable");
        let events = node.labels.map(_ => _.label).filter(_ => _.type === "event").map((evl) => evl);
        let clazz = "operator withoutStack";
        let box = snabbdom_1.h("div", { attrs: { class: clazz } }, [
            snabbdom_1.h("div", [], obs ? `${obs.method}(${obs.args})` : node.name),
            snabbdom_1.h("div", [], "stackFrame locationText"),
        ].filter((_, idx) => idx === 0));
        return [box].concat([coordinator.render(events)]);
    }));
    return [root];
}
//# sourceMappingURL=index.js.map