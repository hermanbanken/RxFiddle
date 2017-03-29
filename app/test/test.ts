import { OperatorTest } from "./operators"
import { SubscriptionTest } from "./subscriptions"
import { GenerateTest } from "./generate"
import CrossingTest from "../src/layout/crossings.spec"
import OrderingTest from "../src/layout/ordering.spec"
import TransposeTest from "../src/layout/transpose.spec"
import MedianTest from "../src/layout/median.spec"
import PriorityLayoutSpec from "../src/layout/priority.spec"
import MorphSpec from "../src/visualization/morph.spec"
import TabIndexSpec from "../src/visualization/tabIndex.spec"
import VisualizationLayoutTest from "../src/visualization/layout.spec"

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
