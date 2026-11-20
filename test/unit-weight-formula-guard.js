/**
 * Unit test: Base Weight and Pack Weight are worked out once, in Category.calculateSubtotal. The List adds
 * the Category fields up; the chart, the public page and the embed read them. A subtraction like
 * `subtotalWeight - subtotalWornWeight` anywhere else is a second copy of the rule, and it fails here.
 * Run with: node test/unit-weight-formula-guard.js
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const repo = path.join(__dirname, '..');
const DIRS = ['client', 'server'];
const ALLOWED = ['client/models/category.js'];

// "<some> weight minus (<worn or consumable> weight)", with or without parentheses.
const FORMULA = /[Ww]eight\s*-\s*\(?\s*[\w.]*(Worn|Consumable)Weight/;

assert.ok(FORMULA.test('const base = cat.subtotalWeight - cat.subtotalWornWeight'), 'the pattern sees a plain subtraction');
assert.ok(FORMULA.test('totalBaseWeight = totalWeight - (totalWornWeight + totalConsumableWeight);'), 'the pattern sees a grouped subtraction');
assert.ok(FORMULA.test('categoryTotal = (category.subtotalWeight - (category.subtotalConsumableWeight + x))'), 'the pattern sees a nested one');
assert.ok(!FORMULA.test('this.totalWornWeight += weight * (qty > 0 ? 1 : 0)'), 'the pattern leaves additions alone');

const problems = [];
let files = 0;
DIRS.forEach((dir) => {
    (function walk(d) {
        fs.readdirSync(d, { withFileTypes: true }).forEach((entry) => {
            const full = path.join(d, entry.name);
            if (entry.isDirectory()) return entry.name === 'node_modules' ? undefined : walk(full);
            if (!/\.(js|vue)$/.test(entry.name)) return undefined;
            const rel = path.relative(repo, full).split(path.sep).join('/');
            if (ALLOWED.includes(rel)) return undefined;
            files += 1;
            fs.readFileSync(full, 'utf8').split('\n').forEach((line, i) => {
                if (/^\s*(\/\/|\/\*|\*)/.test(line)) return;
                if (FORMULA.test(line)) problems.push(`${rel}:${i + 1}: ${line.trim()}`);
            });
            return undefined;
        });
    }(path.join(repo, dir)));
});

assert.deepStrictEqual(problems, [], `\nBase and Pack Weight come from Category.calculateSubtotal; read the field:\n${problems.join('\n')}`);
console.log(`unit-weight-formula-guard: ok (${files} files)`);
