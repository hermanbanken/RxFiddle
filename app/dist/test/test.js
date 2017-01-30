"use strict";
const operators_1 = require("./operators");
const subscriptions_1 = require("./subscriptions");
const crossings_spec_1 = require("../src/layout/crossings.spec");
const ordering_spec_1 = require("../src/layout/ordering.spec");
const transpose_spec_1 = require("../src/layout/transpose.spec");
const median_spec_1 = require("../src/layout/median.spec");
const priority_spec_1 = require("../src/layout/priority.spec");
const layout_spec_1 = require("../src/visualization/layout.spec");
new operators_1.OperatorTest();
new ordering_spec_1.default();
new layout_spec_1.default();
new subscriptions_1.SubscriptionTest();
new crossings_spec_1.default();
new transpose_spec_1.default();
new median_spec_1.default();
new priority_spec_1.default();
//# sourceMappingURL=test.js.map