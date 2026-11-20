/**
 * Unit test: the client keeps no hand-bumped version counters (`itemVersion`, `categoryItemVersion`).
 * Vue follows the library on its own. A view that does not redraw after a change reads something Vue
 * cannot see; the fix is to read it from the model, not to add a counter that every mutation must remember
 * to bump (reorderItem forgot, and the donut kept its old slices). test/e2e/editor-reactivity.spec.ts
 * checks the screen after each kind of change.
 * Run with: node test/unit-no-version-counters.js
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '../client');
const COUNTER = /\b(itemVersion|categoryItemVersion)\b/;

assert.ok(COUNTER.test('if (itemVersion < 0) return []'), 'the pattern sees a counter');
assert.ok(!COUNTER.test('const versionedItems = []'), 'the pattern leaves other words alone');

const problems = [];
let files = 0;
(function walk(dir) {
    fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) return walk(full);
        if (!/\.(js|vue)$/.test(entry.name)) return undefined;
        files += 1;
        fs.readFileSync(full, 'utf8').split('\n').forEach((line, i) => {
            if (COUNTER.test(line)) problems.push(`${path.relative(root, full)}:${i + 1}: ${line.trim()}`);
        });
        return undefined;
    });
}(root));

assert.deepStrictEqual(problems, [], `\nNo version counters: read the data the view draws from the model.\n${problems.join('\n')}`);
console.log(`unit-no-version-counters: ok (${files} files)`);
