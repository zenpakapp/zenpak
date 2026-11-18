/**
 * Unit test: motion that travels or turns has a reduced-motion alternative. A file with a keyframe
 * that moves or rotates, or a transition that slides (transform plus translate), holds a
 * `prefers-reduced-motion` block. Smooth scrolling goes through scrollBehavior() in utils/motion.js.
 * Run with: node test/unit-reduced-motion.js
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
        else if (/\.(scss|vue|js)$/.test(entry.name)) files.push(full);
    });
}(root));

const offenders = [];
let travelling = 0;
files.forEach((file) => {
    const rel = path.relative(root, file);
    const source = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');

    if (rel !== 'utils/motion.js' && /behavior:\s*['"]smooth['"]/.test(source)) {
        offenders.push(`${rel}: smooth scrolling written out, use scrollBehavior()`);
    }
    if (!/\.(scss|vue)$/.test(rel)) return;

    const keyframesMove = [...source.matchAll(/@keyframes\s+\w+\s*\{([\s\S]*?\n\})/g)].some((m) => /transform\s*:/.test(m[1]) || /\{[^}]*transform/.test(m[1]));
    const slides = /transition[^;]*\btransform\b/.test(source) && /translate/.test(source);
    if (!keyframesMove && !slides) return;
    travelling += 1;
    if (!/prefers-reduced-motion:\s*reduce/.test(source)) offenders.push(`${rel}: moves or slides, no prefers-reduced-motion block`);
});

assert.strictEqual(offenders.length, 0, `reduced motion missing:\n${offenders.join('\n')}`);
assert.ok(/export function scrollBehavior/.test(fs.readFileSync(path.join(root, 'utils/motion.js'), 'utf8')), 'scrollBehavior exists');
console.log(`unit-reduced-motion: ok (${travelling} files that move, all with a reduced-motion alternative)`);
