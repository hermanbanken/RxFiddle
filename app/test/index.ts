import { TreeCollectorTest } from "../src/instrumentation/rxjs-4.1.0/collector.spec"
import CrossingTest from "../src/layout/crossings.spec"
import MedianTest from "../src/layout/median.spec"
import OrderingTest from "../src/layout/ordering.spec"
import PriorityLayoutSpec from "../src/layout/priority.spec"
import TransposeTest from "../src/layout/transpose.spec"
import UtilsTest from "../src/utils.spec"
import VisualizationLayoutTest from "../src/visualization/layout.spec"
import MorphSpec from "../src/visualization/morph.spec"
import TabIndexSpec from "../src/visualization/tabIndex.spec"

import { GenerateTest } from "./generate"
import { IntegrationTest } from "./integration"
import { OperatorTest } from "./operators"
import { SubscriptionTest } from "./subscriptions"

// tslint:disable:no-unused-new
new IntegrationTest()
new TreeCollectorTest()
new OperatorTest()
new OrderingTest()
new VisualizationLayoutTest()
new GenerateTest()
new SubscriptionTest()
new CrossingTest()
new TransposeTest()
new MedianTest()
new PriorityLayoutSpec()
new MorphSpec()
new TabIndexSpec()
new UtilsTest()
