"use strict";
const graphlib_1 = require("graphlib");
class TypedGraph extends graphlib_1.Graph {
    setNode(name, label) {
        super.setNode(name, label);
        return this;
    }
    removeNode(name) {
        super.removeNode(name);
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
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = TypedGraph;
//# sourceMappingURL=typedgraph.js.map