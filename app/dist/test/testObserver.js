"use strict";
class TestObserver {
    constructor() {
        this.nexts = [];
        this.error = null;
        this.completed = false;
        this.events = [];
    }
    onNext(value) {
        this.nexts.push(value);
        this.events.push({ time: new Date(), value });
    }
    onError(exception) {
        this.error = exception;
        this.events.push({ time: new Date(), exception });
    }
    onCompleted() {
        let completed = this.completed = true;
        this.events.push({ time: new Date(), completed });
    }
    makeSafe(disposable) {
        return this;
    }
    dispose() {
        let disposed = true;
        this.events.push({ time: new Date(), disposed });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = TestObserver;
//# sourceMappingURL=testObserver.js.map