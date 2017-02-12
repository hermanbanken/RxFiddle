"use strict";
function jsonify(obj) {
    let cache = [];
    let json = JSON.stringify(obj, (key, value) => {
        if (typeof value === "string" && key === "stack") {
            return value.split("\\n")[0];
        }
        if (typeof value === "object" && key === "parent" && "id" in value) {
            return value.id;
        }
        if (typeof value === "object" && key === "childs") {
            return "muted";
        }
        if (typeof value === "object" && value !== null) {
            if (cache.indexOf(value) !== -1) {
                // Circular reference found, discard key
                if (typeof value === "object") {
                    value = Object.keys(value)
                        .filter(k => value.hasOwnProperty(k))
                        .map(k => value[k])
                        .filter(c => typeof c !== "object");
                    return "[Circular " + jsonify(value) + "]";
                }
                return "[Circular " + value.toString() + "]";
            }
            // Store value in our collection
            cache.push(value);
        }
        return value;
    }, "  ");
    cache = null; // Enable garbage collection
    return json;
}
exports.jsonify = jsonify;
//# sourceMappingURL=utils.js.map