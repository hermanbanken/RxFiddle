"use strict";
const color_1 = require("../color");
const layout_1 = require("../layout/layout");
require("../object/extensions");
require("../utils");
const h_1 = require("snabbdom/h");
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
    renderSvg(graph, viewState) {
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
                r: 5,
            },
            on: {
                click: (e) => console.log(item.id),
            }
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = StructureGraph;
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
//# sourceMappingURL=structureGraph.js.map