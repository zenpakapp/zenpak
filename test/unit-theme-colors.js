/**
 * Unit test: colours come from tokens. Outside _theme-vars.scss (the themed custom properties) and
 * _globals.scss (the static tokens), no style rule of the style sheets or of the components writes a
 * colour as a hex or as numbers (rgb(…, rgba(…): it takes a token, a theme variable
 * (rgba(var(--color-accent-rgb), 0.1)) or a SCSS variable (rgba($paper, 0.5)). This is what keeps a
 * colour from staying bright in the dark theme.
 * Every themed custom property is also defined three times: light, dark and the automatic dark.
 * Run with: node test/unit-theme-colors.js
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '../client');
const HEX = /(?<![\w&$-])#[0-9a-fA-F]{3,8}\b/;
const NUMERIC_RGB = /(?<!var\()rgba?\(\s*\d/;

function styleLines(file) {
    const text = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n').split('\n');
    if (file.endsWith('.scss')) return text.map((line, i) => ({ line, n: i + 1 }));
    const out = [];
    let inside = false;
    text.forEach((line, i) => {
        if (line.includes('<style')) { inside = true; return; }
        if (line.includes('</style>')) inside = false;
        if (inside) out.push({ line, n: i + 1 });
    });
    return out;
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
let scanned = 0;
files.forEach((file) => {
    const rel = path.relative(root, file);
    if (rel === 'css/_theme-vars.scss' || rel === 'css/_globals.scss') return;
    styleLines(file).forEach(({ line, n }) => {
        const code = line.replace(/\/\/.*$/, '').trim();
        if (!code || code.startsWith('/*') || code.startsWith('@import') || code.startsWith('content')) return;
        // A SCSS variable or a custom property is where a colour is named: that is the point.
        if (code.startsWith('$') || code.startsWith('--')) return;
        scanned += 1;
        if (HEX.test(code) || NUMERIC_RGB.test(code)) offenders.push(`${rel}:${n}  ${code.slice(0, 90)}`);
    });
});

assert(scanned > 3000, `the scan read the style rules (${scanned})`);
assert.deepStrictEqual(offenders, [], `write a token, not a colour:\n  ${offenders.join('\n  ')}`);

// The themed properties exist in the three blocks of _theme-vars.scss.
const theme = fs.readFileSync(path.join(root, 'css/_theme-vars.scss'), 'utf8');
['success-bg', 'success-border', 'success-text', 'warning-bg', 'warning-border', 'warning-text', 'badge-bg', 'badge-text']
    .forEach((name) => {
        const count = (theme.match(new RegExp(`--color-${name}:`, 'g')) || []).length;
        assert.strictEqual(count, 3, `--color-${name} is defined in light, dark and automatic dark (found ${count})`);
    });

console.log(`unit-theme-colors: ok (${scanned} style lines, no colour written out)`);
