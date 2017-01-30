import { Edge as GraphEdge, Graph, GraphOptions } from "graphlib";
export default class TypedGraph<V, E> extends Graph {
    private options;
    constructor(name?: string, options?: GraphOptions);
    constructor(options?: GraphOptions);
    filterNodes(filter: (node: string, label: V) => boolean): this;
    filterEdges(filter: (obj: GraphEdge, label: E) => boolean): this;
    flatMap<V2, E2>(nodeMap: (id: string, label: V) => {
        id: string;
        label: V2;
    }[], edgeMap: (id: GraphEdge, label: E) => {
        id: GraphEdge;
        label: E2;
    }[]): TypedGraph<V2, E2>;
    setNode(name: string, label?: V): this;
    node(name: string): V;
    setEdge(v: string, w: string, label?: E): this;
    edge(v: string, w: string): E;
    edge(v: GraphEdge): E;
    toDot(nodeProps?: (n: V) => any, edgeProps?: (e: E) => any, cluster?: (n: V) => string): string;
}
