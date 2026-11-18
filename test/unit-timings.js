/**
 * Unit test: delays come from client/services/timings.js. A setTimeout, setInterval or idle
 * `timeout:` in the client is a named constant, 0, or a line that says `timing-exempt` in a comment.
 * Run with: node test/unit-timings.js
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
        else if (entry.name.endsWith('.js') || entry.name.endsWith('.vue')) files.push(full);
    });
}(root));

const call = /(?:setTimeout|setInterval)\(.*,\s*(\d+)\s*\)|\btimeout:\s*(\d+)|style\.(?:transition|animation)\w*\s*=.*?(\d*\.?\d+)m?s\b/;
const offenders = [];
let scanned = 0;
files.forEach((file) => {
    const rel = path.relative(root, file);
    if (rel === 'services/timings.js') return;
    fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n').split('\n').forEach((line, i) => {
        const m = call.exec(line);
        if (!m) return;
        scanned += 1;
        if (Number(m[1] || m[2] || m[3]) === 0 || line.includes('timing-exempt')) return;
        offenders.push(`${rel}:${i + 1}  ${line.trim().slice(0, 100)}`);
    });
});

assert.strictEqual(offenders.length, 0, `delays written out, use client/services/timings.js:\n${offenders.join('\n')}`);
const timings = fs.readFileSync(path.join(root, 'services/timings.js'), 'utf8');
assert.ok(/export const \w+_MS = \d+;/.test(timings), 'timings.js exports _MS constants');
console.log(`unit-timings: ok (${scanned} timers, none with a written delay or duration)`);
