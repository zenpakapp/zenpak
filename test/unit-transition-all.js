/**
 * Unit test: no rule transitions "all". It animates every property that changes, including layout
 * ones (margin, max-width) and the blur of a backdrop, and it redoes the layout of a large
 * container on each frame. A transition names the properties it moves.
 * Run with: node test/unit-transition-all.js
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '../client');
const problems = [];
let files = 0;

(function walk(dir) {
    fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) return walk(full);
        if (!/\.(scss|vue)$/.test(entry.name)) return undefined;
        files += 1;
        fs.readFileSync(full, 'utf8').split('\n').forEach((line, i) => {
            if (/^\s*(\/\/|\/\*|\*)/.test(line)) return;
            if (/transition(-property)?:[^;]*\ball\b/.test(line)) problems.push(`${path.relative(root, full)}:${i + 1}: ${line.trim()}`);
        });
        return undefined;
    });
}(root));

assert.deepStrictEqual(problems, [], `\nName the properties instead of "all":\n${problems.join('\n')}`);
console.log(`unit-transition-all: ok (${files} files)`);
