"use strict";
function flatMap(f) {
    return this.reduce((p, n, index) => p.concat(f(n, index)), []);
}
Array.prototype.flatMap = flatMap;
function getName() {
    let funcNameRegex = /function (.{1,})\(/;
    let results = (funcNameRegex).exec((this).constructor.toString());
    return (results && results.length > 1) ? results[1] : "";
}
Object.prototype.getName = getName;
/* random */
function endsWith(self, suffix) {
    return self.indexOf(suffix, self.length - suffix.length) !== -1;
}
exports.endsWith = endsWith;
;
//# sourceMappingURL=utils.js.map