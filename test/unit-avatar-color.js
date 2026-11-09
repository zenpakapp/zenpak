/**
 * Unit test: the colour behind an avatar initial. The initial is white, so every colour must reach
 * the 4.5:1 contrast ratio, including yellows and greens that look lighter than blues at the same
 * lightness. Blues and purples keep their lightness, and a seed always gives the same colour.
 * Run with: node test/unit-avatar-color.js
 */

'use strict';

const assert = require('assert');
const { avatarColor, avatarInitial, contrastWithWhite } = require('../client/utils/avatar.js');

function parse(color) {
    const match = /^hsl\((\d+), (\d+)%, (\d+)%\)$/.exec(color);
    assert(match, `unexpected colour ${color}`);
    return { hue: Number(match[1]), saturation: Number(match[2]), lightness: Number(match[3]) };
}

// Many seeds cover every hue.
const seenHues = new Set();
for (let i = 0; i < 20000; i++) {
    const { hue, lightness } = parse(avatarColor(`user${i}`));
    seenHues.add(hue);
    assert(contrastWithWhite(hue, lightness) >= 4.5, `hue ${hue} at ${lightness}% is below 4.5:1`);
}
assert(seenHues.size > 340, `seeds cover ${seenHues.size} hues`);

// Blues, purples and magentas were already readable and keep the original lightness.
for (let i = 0; i < 20000; i++) {
    const { hue, lightness } = parse(avatarColor(`user${i}`));
    if (hue >= 230) assert.strictEqual(lightness, 46, `hue ${hue} should not change`);
}

// A light hue gets darker, not lighter.
let yellowGreenSeen = false;
for (let i = 0; i < 20000 && !yellowGreenSeen; i++) {
    const { hue, lightness } = parse(avatarColor(`user${i}`));
    if (hue >= 60 && hue <= 120) {
        assert(lightness < 46, `hue ${hue} should be darker than 46%`);
        yellowGreenSeen = true;
    }
}
assert(yellowGreenSeen);

// Same seed, same colour; an empty seed still gives a colour.
assert.strictEqual(avatarColor('fxbenard'), avatarColor('fxbenard'));
parse(avatarColor(''));
parse(avatarColor(undefined));

assert.strictEqual(avatarInitial('zoe', 'x'), 'Z');
assert.strictEqual(avatarInitial('', 'abc'), 'A');
assert.strictEqual(avatarInitial('', ''), '?');

console.log('ok');
