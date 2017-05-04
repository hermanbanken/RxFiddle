"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Observable_1 = require("rxjs/Observable");
var Rx = require("rxjs");
require("rxjs/add/observable/of");
require("rxjs/add/operator/map");
var rxfiddle_1 = require("rxfiddle");
new rxfiddle_1.RxFiddle({
    Observable: Rx.Observable,
    SubscriberProto: Rx.Subscriber.prototype,
    ObservableProto: Rx.Observable.prototype
}).serve({ port: 8080 });
/* Rest of your application here */
var obs = Observable_1.Observable.of(1, 2, 3);
var obs2 = obs.map(function (x) { return x * 2; });
var sub = obs2.subscribe();
console.log(obs.prototype);
console.log(obs2.prototype);
console.log(sub.prototype);
