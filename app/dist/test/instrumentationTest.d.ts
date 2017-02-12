import Instrumentation from "../src/collector/instrumentation";
import Collector, { RxCollector } from "../src/collector/logger";
export declare class InstrumentationTest {
    protected instrumentation: Instrumentation;
    protected collector: RxCollector;
    before(): void;
    after(): void;
    ensureCollector(arg: any): arg is Collector;
    rxCheck(): void;
    readonly rxcollector: Collector;
    readonly newcollector: Collector;
}
