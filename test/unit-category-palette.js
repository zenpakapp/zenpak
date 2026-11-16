/**
 * Unit test: the default category colours of the donut. The first one is the ZenPak green, and the
 * eleven stay clearly apart from each other so two neighbouring slices are never mistaken.
 * Run with: node test/unit-category-palette.js
 */

'use strict';

const assert = require('assert');
const colorUtils = require('../client/utils/color.js');

const colors = Array.from({ length: 11 }, (_, i) => colorUtils.getColor(i));

assert.deepStrictEqual(colors[0], { r: 45, g: 122, b: 79 }, 'the first category is ZenPak green');

// Euclidean distance in RGB: a rough but stable measure of "clearly apart".
const MIN_DISTANCE = 60;
let closest = Infinity;
for (let i = 0; i < colors.length; i++) {
    for (let j = i + 1; j < colors.length; j++) {
        const a = colors[i];
        const b = colors[j];
        const d = Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
        closest = Math.min(closest, d);
        assert(d >= MIN_DISTANCE, `colours ${i} and ${j} are ${Math.round(d)} apart, below ${MIN_DISTANCE}`);
    }
}

// Past eleven categories the colours come round again, darker then lighter. In the donut the last
// slice touches the first, and neighbouring slices must differ for any number of categories.
const NEIGHBOUR_MIN = 40;
const dist = (a, b) => Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
for (let count = 2; count <= 33; count++) {
    const all = Array.from({ length: count }, (_, i) => colorUtils.getColor(i));
    for (let i = 0; i < count; i++) {
        const next = all[(i + 1) % count];
        assert(dist(all[i], next) >= NEIGHBOUR_MIN, `with ${count} categories, slices ${i} and ${(i + 1) % count} are ${Math.round(dist(all[i], next))} apart`);
    }
}
assert.notDeepStrictEqual(colorUtils.getColor(11), colors[0], 'the twelfth is not the first colour again');

// list.js asks with the key of a for...in loop, which is a string: it must give the same colour as
// the number, or the legend and the donut disagree (a "1" + 2 that becomes "12").
for (let i = 0; i < 34; i++) {
    assert.deepStrictEqual(colorUtils.getColor(String(i)), colorUtils.getColor(i), `getColor("${i}") differs from getColor(${i})`);
}

console.log(`unit-category-palette: ok (closest pair ${Math.round(closest)} apart)`);
