/**
 * Unit test: motion durations come from the scale in _globals.scss. A transition or animation in the
 * style sheets and the components uses a $transitionDuration* or $loopDuration* token, 0s, or a line
 * that says `motion-exempt` in a comment.
 * Run with: node test/unit-motion-scale.js
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
    if (rel === 'css/_globals.scss') return;
    fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n').split('\n').forEach((line, i) => {
        if (!/^\s*(transition|animation)[a-z-]*\s*:/.test(line)) return;
        scanned += 1;
        if (/\$(transitionDuration|loopDuration)/.test(line)) tokens += 1;
        const literals = (line.match(/(?<![\w$-])\d*\.?\d+m?s\b/g) || []).filter((v) => !/^0m?s$/.test(v));
        if (literals.length && !line.includes('motion-exempt')) offenders.push(`${rel}:${i + 1}  ${line.trim().slice(0, 100)}`);
    });
});

assert.strictEqual(offenders.length, 0, `durations written out, use the scale in _globals.scss:\n${offenders.join('\n')}`);
const globals = fs.readFileSync(path.join(root, 'css/_globals.scss'), 'utf8');
['$transitionDurationDialog', '$loopDurationSpinner', '$loopDurationSweep'].forEach((t) => assert.ok(globals.includes(`${t}:`), `${t} defined`));
console.log(`unit-motion-scale: ok (${scanned} transitions and animations, ${tokens} on tokens)`);
