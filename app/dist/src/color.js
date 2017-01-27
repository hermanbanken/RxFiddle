/* tslint:disable:one-variable-per-declaration */
/* tslint:disable:switch-default */
/* tslint:disable:no-bitwise */
/* tslint:disable:variable-name */
"use strict";
/**
 * HSV values from [0..1[
 * RGB values from 0 to 255
 * @see http://martin.ankerl.com/2009/12/09/how-to-create-random-colors-programmatically/
 */
function hsvToRgb(h, s, v) {
    let h_i = ~~(h * 6);
    let f = h * 6 - h_i;
    let p = v * (1 - s);
    let q = v * (1 - f * s);
    let t = v * (1 - (1 - f) * s);
    let r = 0, g = 0, b = 0;
    switch (h_i) {
        case 0:
            [r, g, b] = [v, t, p];
            break;
        case 1:
            [r, g, b] = [q, v, p];
            break;
        case 2:
            [r, g, b] = [p, v, t];
            break;
        case 3:
            [r, g, b] = [p, q, v];
            break;
        case 4:
            [r, g, b] = [t, p, v];
            break;
        case 5:
            [r, g, b] = [v, p, q];
            break;
    }
    return [~~(r * 265), ~~(g * 265), ~~(b * 265)];
}
exports.hsvToRgb = hsvToRgb;
const golden_ratio_conjugate = 0.618033988749895;
function generateColors(count) {
    let cs = [];
    let h = Math.random(); // use random start value
    while (count--) {
        h += golden_ratio_conjugate;
        h %= 1;
        cs.push(hsvToRgb(h, 0.5, 0.95));
    }
    return cs;
}
exports.generateColors = generateColors;
//# sourceMappingURL=color.js.map