/**
 * Unit test: no route writes its own sliding-window limiter. server/rate-limiter.js is the one place
 * that keeps a Map of timestamps and filters it by a window; two copies of it already existed
 * (copy and publish), and a fix in one would not reach the other.
 * Run with: node test/unit-no-handmade-rate-limiter-guard.js
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '../server');
const OWNER = 'rate-limiter.js';

// `.filter((t) => t > windowStart)`: a list of timestamps cut to the window.
const HANDMADE = /\.filter\(\s*\(?\s*\w+\s*\)?\s*=>\s*\w+\s*>\s*\w*[wW]indow\w*\s*\)/;

assert.ok(HANDMADE.test('const ts = (m.get(key) || []).filter((t) => t > windowStart);'), 'the pattern sees the copied limiter');
assert.ok(!HANDMADE.test('const open = items.filter((i) => i.id > minId);'), 'the pattern leaves other filters alone');

const problems = [];
let files = 0;
fs.readdirSync(dir).filter((f) => f.endsWith('.js') && f !== OWNER).forEach((f) => {
    files += 1;
    fs.readFileSync(path.join(dir, f), 'utf8').split('\n').forEach((line, i) => {
        if (HANDMADE.test(line)) problems.push(`server/${f}:${i + 1}: ${line.trim()}`);
    });
});

assert.deepStrictEqual(problems, [], `\nUse createRateLimiter (server/rate-limiter.js):\n${problems.join('\n')}`);
console.log(`unit-no-handmade-rate-limiter-guard: ok (${files} files)`);
