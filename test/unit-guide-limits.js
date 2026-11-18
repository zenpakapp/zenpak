/**
 * Unit test: the Guide field limits are written once, in client/services/guide-limits.js, and match
 * what server/guide-endpoints.js cuts at. guide.vue holds no literal maxlength.
 * Run with: node test/unit-guide-limits.js
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const read = (rel) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
const view = read('client/views/guide.vue');
const server = read('server/guide-endpoints.js');
const limits = {};
read('client/services/guide-limits.js').replace(/^\s+(\w+): (\d+),/gm, (_, key, value) => { limits[key] = Number(value); });

assert.deepStrictEqual(Object.keys(limits).sort(), ['disclosure', 'rule', 'text', 'url']);
assert.doesNotMatch(view, /\smaxlength="/, 'guide.vue: use :maxlength="limits.*"');
const used = [...view.matchAll(/:maxlength="limits\.(\w+)"/g)].map((m) => m[1]);
assert.ok(used.length >= 10, 'guide.vue reads its limits');
used.forEach((key) => assert.ok(key in limits, `unknown limit limits.${key}`));

// Every length the server cuts a Guide field at is one of the client limits.
const cuts = new Set([...server.matchAll(/\.slice\(0, (\d{2,})\)/g)].map((m) => Number(m[1])));
Object.entries(limits).forEach(([key, value]) => assert.ok(cuts.has(value), `limits.${key} (${value}) has no matching slice in guide-endpoints.js`));

console.log(`unit-guide-limits: ok (${used.length} fields, ${Object.keys(limits).length} limits match the server)`);
