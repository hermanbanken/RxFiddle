"use strict";
const logger_1 = require("./logger");
class Event {
    constructor(type, time) {
        this.type = type;
        this.time = time;
    }
    static fromRecord(record) {
        switch (record.method) {
            case "next":
            case "error":
            case "completed":
                return;
            case "onNext":
                return new Next(record.time, record.arguments[0]);
            case "onError":
            case "fail":
                return new Error(record.time, record.arguments[0]);
            case "onCompleted":
                return new Complete(record.time);
            case "subscribe":
            case "_subscribe":
            case "__subscribe":
                return new Subscribe(record.time);
            case "dispose":
                return new Dispose(record.time);
            default: break;
        }
    }
    static fromJson(input) {
        switch (input.type) {
            case "next": return new Next(input.time, input.value);
            case "error": return new Error(input.time, input.error);
            case "complete": return new Complete(input.time);
            case "subscribe": return new Subscribe(input.time);
            case "dispose": return new Dispose(input.time);
            default: return null;
        }
    }
}
exports.Event = Event;
class Next extends Event {
    constructor(time, value) {
        super("next", time);
        this.value = logger_1.formatArguments([value]);
    }
}
exports.Next = Next;
class Error extends Event {
    constructor(time, error) {
        super("error", time);
        this.error = error;
    }
}
exports.Error = Error;
class Complete extends Event {
    constructor(time) { super("complete", time); }
}
exports.Complete = Complete;
class Subscribe extends Event {
    constructor(time) { super("subscribe", time); }
}
exports.Subscribe = Subscribe;
class Dispose extends Event {
    constructor(time) { super("dispose", time); }
}
exports.Dispose = Dispose;
//# sourceMappingURL=event.js.map