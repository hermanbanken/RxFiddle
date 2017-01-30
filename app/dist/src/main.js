"use strict";
const visualization_1 = require("./visualization");
const dom_1 = require("@cycle/dom");
const rx_run_1 = require("@cycle/rx-run");
const Immutable = require("immutable");
const Rx = require("rx");
const rxmarbles_1 = require("rxmarbles");
const jsonCollector_1 = require("./collector/jsonCollector");
const Observable = Rx.Observable;
window.Rx = Rx;
let collector = new jsonCollector_1.default("F_newstyle.json");
// let collector = new Collector()
// let instrumentation = new Instrumentation(defaultSubjects, collector)
// instrumentation.setup()
let vis = new visualization_1.default(new visualization_1.Grapher(collector), document.querySelector("app"), document.getElementById("controls"));
vis.step();
window.collector = collector;
window.visualizer = vis;
//      /\    
//     /  \   
//    / /\ \  
//   / ____ \ 
//  /_/    \_\
function a() {
    Rx.Observable.of(1, 2, 3)
        .map(s => s)
        .groupBy(v => v)
        .mergeAll()
        .subscribe();
}
//  ____  
// |  _ \ 
// | |_) |
// |  _ < 
// | |_) |
// |____/ 
// Rx.Observable.create(subscriber => {
//   subscriber.onNext("hi!")
//   subscriber.onNext("boo")
//   subscriber.onCompleted()
// })
function b() {
    var A = Rx.Observable.interval(1000)
        .map(i => "Hello " + i)
        .filter(_ => true)
        .map(_ => _)
        .skip(1)
        .publish();
    var B = Rx.Observable.never();
    A.flatMapLatest(s => Rx.Observable.of("bla").startWith(s))
        .groupBy(s => s[s.length - 1])
        .map(o => o.startWith("group of " + o.key))
        .mergeAll()
        .subscribe(console.log);
    A.map(a => a.split("").reverse().join(""))
        .merge(B)
        .filter(a => true)
        .subscribe(console.log);
    A.connect();
}
//    _____ 
//   / ____|
//  | |     
//  | |     
//  | |____ 
//   \_____|
function c() {
    // Setup
    rxmarbles_1.default.AddCollectionOperator(undefined);
    rxmarbles_1.default.AddCollectionOperator(Rx);
    function main(sources) {
        let data = Immutable.fromJS({
            end: 100,
            notifications: [{
                    content: "A",
                    diagramId: 0,
                    id: 1,
                    time: 10,
                }],
        });
        const diagram = rxmarbles_1.default.DiagramComponent({
            DOM: sources.DOM, props: {
                class: "diagram",
                data: Observable.of(data, data, data),
                interactive: Observable.of(true, true, true, true),
                key: `diagram0`,
            }
        });
        return {
            DOM: diagram.DOM,
        };
    }
    rx_run_1.default.run(main, {
        DOM: dom_1.makeDOMDriver("#app"),
    });
}
function run(m) {
    m();
}
document.getElementById("a").onclick = run.bind(null, a);
document.getElementById("b").onclick = run.bind(null, b);
document.getElementById("c").onclick = run.bind(null, c);
let trace = document.getElementById("trace");
let ids = document.getElementById("showIds");
trace.addEventListener("click", () => {
    // instrumentation.stackTraces = trace.checked
});
ids.addEventListener("click", () => {
    // vis.showIds = ids.checked
});
c();
//# sourceMappingURL=main.js.map