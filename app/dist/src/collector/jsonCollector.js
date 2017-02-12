"use strict";
const Rx = require("rx");
class JsonCollector {
    constructor(url) {
        this.subject = new Rx.Subject();
        this.write = () => {
            // intentionally left blank
        };
        this.url = url;
        if (url.startsWith("ws://")) {
            let socket = new WebSocket(url);
            socket.onmessage = (m) => this.receive(JSON.parse(m.data));
            this.write = (d) => socket.send(JSON.stringify(d));
        }
        else {
            fetch(url).then(res => res.json()).then(data => {
                if (typeof window !== "undefined") {
                    window.data = data;
                    console.info("window.data is now filled with JSON data of", url);
                }
                if (typeof data === "object" && Array.isArray(data)) {
                    data.forEach(v => this.receive(v));
                }
            });
        }
        this.dataObs = this.subject.asObservable();
    }
    receive(v) {
        this.subject.onNext(v);
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = JsonCollector;
//# sourceMappingURL=jsonCollector.js.map