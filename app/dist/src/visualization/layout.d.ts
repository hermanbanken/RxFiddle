import TypedGraph from "../collector/typedgraph";
import "../object/extensions";
import "../utils";
export default function layout<V, E>(graph: TypedGraph<V, E>, focusNodes?: string[]): {
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
