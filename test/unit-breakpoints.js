/**
 * Unit test: breakpoints come from the scale. Every @media width in the style sheets and the
 * components is a $bp-* variable (phone 520, tabletS 640, tablet 768, desktopS 980, wide 1240), and
 * the JavaScript matchMedia calls use utils/breakpoints.js, which carries the same numbers.
 * Run with: node test/unit-breakpoints.js
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const breakpoints = require('../client/utils/breakpoints');

const root = path.join(__dirname, '../client');
const files = [];
(function walk(dir) {
    fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/\.(scss|vue|js)$/.test(entry.name)) files.push(full);
    });
}(root));

const offenders = [];
let queries = 0;
files.forEach((file) => {
    const rel = path.relative(root, file);
    fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n').split('\n').forEach((line, i) => {
        if (/@media/.test(line)) {
            queries += 1;
            if (/(min|max)-width:\s*\d/.test(line)) offenders.push(`${rel}:${i + 1}  ${line.trim()}`);
        }
        if (/matchMedia\(\s*['"`][^)]*-width:\s*\d/.test(line)) offenders.push(`${rel}:${i + 1}  ${line.trim()}`);
    });
});
assert(queries > 40, `the scan read the media queries (${queries})`);
assert.deepStrictEqual(offenders, [], `write a breakpoint variable, not a width:\n  ${offenders.join('\n  ')}`);

// The SCSS and the JavaScript carry the same numbers.
const globals = fs.readFileSync(path.join(root, 'css/_globals.scss'), 'utf8');
const names = { phone: 'phone', tabletS: 'tablet-s', tablet: 'tablet', desktopS: 'desktop-s', wide: 'wide' };
Object.keys(names).forEach((key) => {
    const m = new RegExp(`^\\$bp-${names[key]}: (\\d+)px;`, 'm').exec(globals);
    assert(m, `$bp-${names[key]} is defined`);
    assert.strictEqual(Number(m[1]), breakpoints[key], `$bp-${names[key]} equals breakpoints.${key}`);
});

console.log(`unit-breakpoints: ok (${queries} media queries, none with a written width)`);
