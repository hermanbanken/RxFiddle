import { Edge as GraphEdge, Graph } from "graphlib";
export default class TypedGraph<V, E> extends Graph {
    setNode(name: string, label?: V): this;
    removeNode(name: string): this;
    node(name: string): V;
    setEdge(v: string, w: string, label?: E): this;
    edge(v: string, w: string): E;
    edge(v: GraphEdge): E;
}
