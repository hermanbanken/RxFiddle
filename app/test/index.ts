import { TreeCollectorRx4Test } from "../src/instrumentation/rxjs-4.1.0/collector.spec"
import SpeedTest from "../src/instrumentation/rxjs-4.1.0/speedtest.spec"
import { TreeCollectorRx5Test } from "../src/instrumentation/rxjs-5.x.x/collector.spec"
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
new TreeCollectorRx4Test()
new TreeCollectorRx5Test()
new OperatorTest()
new VisualizationLayoutTest()
new GenerateTest()
new SubscriptionTest()
new UtilsTest()

/* Visual */
new OrderingTest()
new TabIndexSpec()
new CrossingTest()
new TransposeTest()
new MedianTest()
new PriorityLayoutSpec()
new MorphSpec()
new SpeedTest()
