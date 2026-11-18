/**
 * Unit test: shadows come from the scale. A box-shadow in the style sheets and the components is
 * none, an inset line (a pressed or hairline effect), a $shadow-* token (soft, raised, popover,
 * modal, bar, drawer, focus-ring), or a line that says `shadow-exempt` in a comment. Every themed
 * shadow is defined three times: light, dark and the automatic dark.
 * Run with: node test/unit-shadow-scale.js
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '../client');
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
let tokens = 0;
files.forEach((file) => {
    const rel = path.relative(root, file);
    if (rel === 'css/_globals.scss' || rel === 'css/_theme-vars.scss') return;
    fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n').split('\n').forEach((line, i) => {
        const m = /^\s*(text-shadow|box-shadow)\s*:\s*(.+?);/.exec(line);
        if (!m) return;
        scanned += 1;
        const value = m[2];
        if (/^\$shadow-[a-z-]+$/.test(value)) { tokens += 1; return; }
        if (value === 'none' || /\binset\b/.test(value) || line.includes('shadow-exempt')) return;
        offenders.push(`${rel}:${i + 1}  ${line.trim().slice(0, 100)}`);
    });
});

assert(scanned > 40, `the scan read the shadows (${scanned})`);
assert(tokens > 20, `the shadows use the tokens (${tokens})`);
assert.deepStrictEqual(offenders, [], `write a $shadow-* token, not a shadow:\n  ${offenders.join('\n  ')}`);

const theme = fs.readFileSync(path.join(root, 'css/_theme-vars.scss'), 'utf8');
const globals = fs.readFileSync(path.join(root, 'css/_globals.scss'), 'utf8');
['soft', 'raised', 'popover', 'modal', 'bar', 'drawer'].forEach((name) => {
    const count = (theme.match(new RegExp(`--shadow-${name}:`, 'g')) || []).length;
    assert.strictEqual(count, 3, `--shadow-${name} is defined in light, dark and automatic dark (found ${count})`);
    assert(globals.includes(`$shadow-${name}: var(--shadow-${name});`), `$shadow-${name} is defined`);
});

console.log(`unit-shadow-scale: ok (${scanned} shadows, ${tokens} on tokens)`);
