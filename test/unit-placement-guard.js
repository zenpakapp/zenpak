/**
 * Unit test: the "one Placement per Item" rule lives in Category.addItem, not in its callers.
 * The model, store and utils must not check "is it there?" before adding: `if (!category.getCategoryItemById(id))
 * category.addItem(...)` is the old copy of the rule. (A check that drives what a view shows, or that decides
 * between a sum and a replace, is not this pattern and is left alone; views are not scanned.)
 * Run with: node test/unit-placement-guard.js
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '../client');
const DIRS = ['models', 'store', 'utils'];

// `!x.getCategoryItemById(id)` guarding an `x.addItem(` call, with or without braces, across lines.
const GUARD = /!\s*[\w.$[\]]+\.getCategoryItemById\([^)]*\)\s*\)\s*\{?\s*[\w.$[\]]+\.addItem\(/g;

assert.ok(GUARD.test('if (!a.getCategoryItemById(x.id)) a.addItem({})'), 'the pattern sees an inline guard');
GUARD.lastIndex = 0;
assert.ok(GUARD.test('} else if (!b.getCategoryItemById(i)) {\n    b.addItem({});'), 'the pattern sees a braced, multi-line guard');
GUARD.lastIndex = 0;
assert.ok(!GUARD.test('const p = c.addItem({}); if (c.getCategoryItemById(1)) return;'), 'the pattern leaves other checks alone');
GUARD.lastIndex = 0;

const problems = [];
let files = 0;
DIRS.forEach((dir) => {
    (function walk(d) {
        fs.readdirSync(d, { withFileTypes: true }).forEach((entry) => {
            const full = path.join(d, entry.name);
            if (entry.isDirectory()) return walk(full);
            if (!entry.name.endsWith('.js')) return undefined;
            files += 1;
            const text = fs.readFileSync(full, 'utf8');
            [...text.matchAll(GUARD)].forEach((m) => {
                const line = text.slice(0, m.index).split('\n').length;
                problems.push(`${path.relative(root, full)}:${line}: ${m[0].replace(/\s+/g, ' ')}`);
            });
            return undefined;
        });
    }(path.join(root, dir)));
});

assert.deepStrictEqual(problems, [], `\nCategory.addItem already returns the existing Placement; drop the check:\n${problems.join('\n')}`);
console.log(`unit-placement-guard: ok (${files} files)`);
