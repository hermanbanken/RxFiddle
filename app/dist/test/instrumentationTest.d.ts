import Instrumentation from "../src/collector/instrumentation";
import Collector from "../src/collector/logger";
export declare class InstrumentationTest {
    protected instrumentation: Instrumentation;
    protected collector: Collector;
    before(): void;
    after(): void;
}
