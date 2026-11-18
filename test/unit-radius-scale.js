/**
 * Unit test: every border-radius of the style sheets and of the components is a token of the radius
 * scale (_globals.scss), never a number. The scale: xs 2 (bars, legend swatches), sm 4 (small
 * controls in a dense row), md 8 (buttons, icon buttons, fields, callouts), lg 12 (cards, dialogs,
 * menus), xl 24 (large cards of the welcome page), pill (chips and badges), round (avatars,
 * spinners, dots). 0 and inherit are allowed.
 * Run with: node test/unit-radius-scale.js
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '../client');
const TOKENS = new Set(['$radius-xs', '$radius-sm', '$radius-md', '$radius-lg', '$radius-xl', '$radius-pill', '$radius-round']);
const OTHER = new Set(['0', 'inherit']);

// The tokens exist, with the sizes the scale promises.
const globals = fs.readFileSync(path.join(root, 'css/_globals.scss'), 'utf8');
const expected = {
    '$radius-xs': '2px', '$radius-sm': '4px', '$radius-md': '8px', '$radius-lg': '12px',
    '$radius-xl': '24px', '$radius-pill': '999px', '$radius-round': '50%',
};
Object.entries(expected).forEach(([name, value]) => {
    assert(new RegExp(`\\${name}:\\s*${value.replace('%', '%')};`).test(globals), `${name} is ${value} in _globals.scss`);
});

function styleBlocks(file) {
    const text = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
    if (file.endsWith('.scss')) return [{ text, offset: 0 }];
    const blocks = [];
    const re = /<style[^>]*>([\s\S]*?)<\/style>/g;
    let m;
    while ((m = re.exec(text))) blocks.push({ text: m[1], offset: text.slice(0, m.index).split('\n').length });
    return blocks;
}

const files = [];
(function walk(dir) {
    fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.name.endsWith('.scss') || entry.name.endsWith('.vue')) files.push(full);
    });
}(root));

const offenders = [];
let checked = 0;
files.forEach((file) => {
    styleBlocks(file).forEach(({ text, offset }) => {
        text.split('\n').forEach((line, i) => {
            const m = /border(?:-(?:top|bottom)-(?:left|right))?-radius:\s*([^;]+);/.exec(line);
            if (!m) return;
            checked += 1;
            const bad = m[1].trim().split(/\s+/).filter((v) => !TOKENS.has(v) && !OTHER.has(v));
            if (bad.length) offenders.push(`${path.relative(root, file)}:${offset + i + 1}  border-radius: ${m[1].trim()}`);
        });
    });
});

assert(checked > 100, `the scan found the radius declarations (${checked})`);
assert.deepStrictEqual(offenders, [], `border-radius must be a token of the scale:\n  ${offenders.join('\n  ')}`);

console.log(`unit-radius-scale: ok (${checked} declarations, all on the scale)`);
