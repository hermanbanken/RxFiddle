import { OperatorTest } from "./operators"
import { SubscriptionTest } from "./subscriptions"
import CrossingTest from "../src/layout/crossings.spec"
import TransposeTest from "../src/layout/transpose.spec"
import MedianTest from "../src/layout/median.spec"
import PriorityLayoutSpec from "../src/layout/priority.spec"
import VisualizationLayoutTest from "../src/visualization/layout.spec"

new OperatorTest()
new VisualizationLayoutTest()

// new SubscriptionTest()
// new CrossingTest()
// new TransposeTest()
// new MedianTest()
// new PriorityLayoutSpec()
