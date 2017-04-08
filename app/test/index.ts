import { TreeCollectorTest } from "../src/instrumentation/rxjs-4.1.0/collector.spec"
import { IntegrationTest } from "./integration"
import { OperatorTest } from "./operators"

new OperatorTest()
new IntegrationTest()
new TreeCollectorTest()