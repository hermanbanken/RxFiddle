/**
 * HSV values from [0..1[
 * RGB values from 0 to 255
 * @see http://martin.ankerl.com/2009/12/09/how-to-create-random-colors-programmatically/
 */
export declare function hsvToRgb(h: number, s: number, v: number): [number, number, number];
export declare function generateColors(count: number): [number, number, number][];
