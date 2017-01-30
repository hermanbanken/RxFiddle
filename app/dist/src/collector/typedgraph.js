"use strict";
const graphlib_1 = require("graphlib");
const _ = require("lodash");
class TypedGraph extends graphlib_1.Graph {
    constructor(arg1, arg2) {
        super(typeof arg1 === "string" ? arg2 : arg1);
        if (typeof arg1 === "string") {
            this.setGraph(arg1);
        }
        this.options = typeof arg1 === "string" ? arg2 : arg1;
    }
    filterNodes(filter) {
        let copy = new TypedGraph(this.options);
        copy.setGraph(this.graph());
        _.each(this.nodes(), (v) => {
            if (filter(v, this.node(v))) {
                copy.setNode(v, this.node(v));
            }
        });
        _.each(this.edges(), (e) => {
            if (copy.hasNode(e.v) && copy.hasNode(e.w)) {
                copy.setEdge(e.v, e.w, this.edge(e));
            }
        });
        return copy;
    }
    filterEdges(filter) {
        let copy = new TypedGraph(this.options);
        copy.setGraph(this.graph());
        _.each(this.edges(), (e) => {
            let label = this.edge(e);
            if (filter(e, label)) {
                if (!copy.hasNode(e.v)) {
                    copy.setNode(e.v, this.node(e.v));
                }
                if (!copy.hasNode(e.w)) {
                    copy.setNode(e.w, this.node(e.w));
                }
                copy.setEdge(e.v, e.w, label);
            }
        });
        return copy;
    }
    flatMap(nodeMap, edgeMap) {
        let copy = new TypedGraph(this.options);
        copy.setGraph(this.graph());
        _.each(this.nodes(), (n) => {
            nodeMap(n, this.node(n)).forEach(({ id, label }) => copy.setNode(id, label));
        });
        _.each(this.edges(), (e) => {
            edgeMap(e, this.edge(e)).forEach(({ id, label }) => copy.setEdge(id.v, id.w, label));
        });
        return copy;
    }
    setNode(name, label) {
        if (typeof label === "undefined" && super.node(name) === "undefined") {
            throw new Error("IllegalArgument for graph Label!");
        }
        else if (typeof label === "undefined") {
            super.setNode(name);
        }
        else {
            super.setNode(name, label);
        }
        return this;
    }
    node(name) {
        return super.node(name);
    }
    setEdge(v, w, label) {
        super.setEdge(v, w, label);
        return this;
    }
    edge(v, w) {
        if (typeof v === "string" && typeof w === "string") {
            return super.edge(v, w);
        }
        else if (typeof v === "object") {
            return super.edge(v);
        }
        else {
            throw new Error("Illegal argument to edge_t function");
        }
    }
    toDot(nodeProps, edgeProps = () => ({ type: "s" }), cluster = () => "") {
        let ns = this.nodes().map((n) => {
            let data = nodeProps && nodeProps(this.node(n));
            if (data) {
                let query = Object.keys(data).map(k => `${k}="${data[k]}"`).join(", ");
                return `${dotEscape(n)} [${query}];`;
            }
            return `${dotEscape(n)};`;
        });
        let es = this.edges().map((e) => {
            let data = edgeProps && edgeProps(this.edge(e));
            if (data) {
                let query = Object.keys(data).map(k => `${k}="${data[k]}"`).join(", ");
                return `${dotEscape(e.v)} -> ${dotEscape(e.w)} [${query}];`;
            }
            return `${dotEscape(e.v)} -> ${dotEscape(e.w)};`;
        });
        let clusters = {};
        this.nodes().forEach((v) => {
            let k = cluster(this.node(v));
            if (!clusters[k]) {
                clusters[k] = [];
            }
            clusters[k].push(`${dotEscape(v)}`);
        });
        let cs = Object.keys(clusters).map((k, index) => {
            let cns = clusters[k].join(" ");
            if (k) {
                return `subgraph cluster${k} { ${cns}; label = "${k}" };`;
            }
            return `subgraph cluster${index} { ${cns} };`;
        });
        return ["digraph g", "{",
            "rankdir=LR",
            "splines=line",
            ...cs,
            ...ns,
            ...es,
            "}"].join("\n");
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = TypedGraph;
function dotEscape(n) {
    return n.match(/[\-.()]/) ? `"${n.replace(/[()]/g, "")}"` : n;
}
//# sourceMappingURL=typedgraph.js.map