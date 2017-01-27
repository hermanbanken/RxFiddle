import TypedGraph from "../collector/typedgraph";
export declare type Ranked = {
    rank: number;
};
export declare type DummyEdge<E> = {
    original: E;
    nodes: string[];
    index: number;
};
export declare type RecreatedEdge<V, E> = {
    original: E;
    nodes: V[];
};
export declare type Pathed<E> = {
    path?: E[];
};
export declare function normalize<V extends Ranked, E>(g: TypedGraph<V, E>, createDummy: (dummyData: {
    id: string;
    rank: number;
}) => V): TypedGraph<V, DummyEdge<E>>;
export declare function denormalize<V, E>(g: TypedGraph<V, DummyEdge<E>>): TypedGraph<V, RecreatedEdge<V, E>>;
