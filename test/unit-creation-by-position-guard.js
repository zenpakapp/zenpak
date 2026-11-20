/**
 * Unit test: nothing finds a new Item or List by its position. `items[items.length - 1]` after a
 * commit assumes the new one lands last in the array; if an insertion order ever changed, the view would
 * pick the wrong Item without an error. A creation hands its object back (services/library-creation.js).
 * Run with: node test/unit-creation-by-position-guard.js
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '../client');
const DIRS = ['components', 'views', 'composables'];

// `<something>.items[<something>.items.length - 1]` or the same for `lists`.
const BY_POSITION = /\b(items|lists)\[\s*[\w.$]*\b\1\.length\s*-\s*1\s*\]/;

assert.ok(BY_POSITION.test('const a = library.items[library.items.length - 1];'), 'the pattern sees the last Item');
assert.ok(BY_POSITION.test('const b = this.$store.state.library.lists[this.$store.state.library.lists.length - 1];'), 'the pattern sees the last List');
assert.ok(BY_POSITION.test('const c = items[items.length - 1];'), 'the pattern sees a local array');
assert.ok(!BY_POSITION.test('const last = focusable[focusable.length - 1];'), 'the pattern leaves other arrays alone');

const problems = [];
let files = 0;
DIRS.forEach((dir) => {
    (function walk(d) {
        fs.readdirSync(d, { withFileTypes: true }).forEach((entry) => {
            const full = path.join(d, entry.name);
            if (entry.isDirectory()) return walk(full);
            if (!/\.(js|vue)$/.test(entry.name)) return undefined;
            files += 1;
            fs.readFileSync(full, 'utf8').split('\n').forEach((line, i) => {
                if (BY_POSITION.test(line)) problems.push(`${path.relative(root, full)}:${i + 1}: ${line.trim()}`);
            });
            return undefined;
        });
    }(path.join(root, dir)));
});

assert.deepStrictEqual(problems, [], `\nUse createItem, createNamedList or duplicateItem (services/library-creation.js), they return the new object:\n${problems.join('\n')}`);
console.log(`unit-creation-by-position-guard: ok (${files} files)`);
