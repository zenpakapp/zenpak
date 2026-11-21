/**
 * Unit test: no client component writes a literal maxlength. Limits come from
 * client/services/field-limits.js (single fields) or guide-limits.js (Guide), and the ones the
 * server also enforces match it.
 * Run with: node test/unit-field-limits.js
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

const files = [];
(function walk(dir) {
    fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.name.endsWith('.vue')) files.push(full);
    });
}(path.join(root, 'client')));

const offenders = [];
let bound = 0;
files.forEach((file) => {
    const rel = path.relative(root, file);
    fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n').split('\n').forEach((line, i) => {
        if (/\smaxlength="/.test(line)) offenders.push(`${rel}:${i + 1}  ${line.trim().slice(0, 100)}`);
        if (/:maxlength="/.test(line)) bound += 1;
    });
});
assert.strictEqual(offenders.length, 0, `literal maxlength, use the limits modules:\n${offenders.join('\n')}`);

const limits = {};
read('client/services/field-limits.js').replace(/^\s+(\w+): (\d+),/gm, (_, key, value) => { limits[key] = Number(value); });
assert.deepStrictEqual(Object.keys(limits).sort(), ['currencySymbol', 'destination', 'oauthUsername', 'publishNote']);

assert.strictEqual(Number(/NOTE_MAX_LENGTH = (\d+);/.exec(read('server/list-versions.js'))[1]), limits.publishNote, 'publishNote matches the server');
assert.strictEqual(Number(/maxLength: (\d+)/.exec(read('server/oauth.js'))[1]), limits.oauthUsername, 'oauthUsername matches the server');

const destinationBody = /function normalizeDestination[\s\S]*?\.slice\(0, (\d+)\)/.exec(read('server/text-limits.js'));
assert.strictEqual(Number(destinationBody[1]), limits.destination, 'destination matches the server');

console.log(`unit-field-limits: ok (${bound} bound maxlength, none written out)`);
