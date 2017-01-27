import { LayerCrossingEdge, Leveled, ShadowEdge } from "../collector/grapher";
import { AddObservable, AddSubscription } from "../collector/logger";
import TypedGraph from "../collector/typedgraph";
import "../object/extensions";
import { StackFrame } from "../utils";
import "../utils";
export default function layout(graph: TypedGraph<Leveled<(StackFrame | AddObservable | AddSubscription)>, LayerCrossingEdge | ShadowEdge | undefined>): {
    edges: {
        points: [{
            x: number;
            y: number;
        }];
        v: string;
        w: string;
    }[];
    nodes: {
        id: string;
        x: number;
        y: number;
    }[];
}[];
