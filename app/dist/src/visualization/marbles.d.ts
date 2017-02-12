import { EventLabel } from "../collector/logger";
import { VNode } from "snabbdom/vnode";
export declare class MarbleCoordinator {
    private min;
    private max;
    add(edges: EventLabel[]): void;
    render(edges: EventLabel[]): VNode;
    private relTime(t);
}
