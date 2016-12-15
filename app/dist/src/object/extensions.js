///<reference path="extensions.d.ts"/>
Object.values = function objectValues(obj) {
    let values = [];
    for (let key in obj) {
        values.push(obj[key]);
    }
    return values;
};
//# sourceMappingURL=extensions.js.map