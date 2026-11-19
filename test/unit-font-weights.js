/**
 * Unit test: the font weight scale keeps its values, and every step is used. Folding two weights
 * into one (700 into 600, which once made the headings lighter site-wide) changes the pinned scale
 * or leaves a step unused, and fails here.
 * Run with: node test/unit-font-weights.js
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '../client');
const scale = {
    light: 300,
    normal: 400,
    medium: 500,
    bold: 600,
    heavy: 700,
    black: 800,
};

const globals = fs.readFileSync(path.join(root, 'css/_globals.scss'), 'utf8');
const defined = {};
globals.replace(/^\$fontWeight-(\w+):\s*(\d+);/gm, (_, name, value) => { defined[name] = Number(value); });
assert.deepStrictEqual(defined, scale, 'font weight scale changed: update this test only if the change is meant');

const files = [];
(function walk(dir) {
    fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.name.endsWith('.scss') || entry.name.endsWith('.vue')) files.push(full);
    });
}(root));

const uses = {};
files.forEach((file) => {
    if (path.relative(root, file) === 'css/_globals.scss') return;
    const source = fs.readFileSync(file, 'utf8');
    [...source.matchAll(/font-weight:\s*\$fontWeight-(\w+)/g)].forEach((m) => { uses[m[1]] = (uses[m[1]] || 0) + 1; });
});
Object.keys(scale).forEach((name) => assert.ok(uses[name] > 0, `$fontWeight-${name} is never used`));

console.log(`unit-font-weights: ok (${Object.keys(scale).map((n) => `${n} ${scale[n]}×${uses[n]}`).join(', ')})`);
