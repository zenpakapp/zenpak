/**
 * Unit test: type comes from the scale. A px font-size in the style sheets and the components is a
 * $fontSize-* token, or the line says `font-size-exempt` in a comment (decorative or hero sizes).
 * Relative units (em, rem, %, clamp, calc) are left alone. A letter-spacing is a $letterSpacing-*
 * token, 0 or normal.
 * Run with: node test/unit-font-scale.js
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
        else if (entry.name.endsWith('.scss') || entry.name.endsWith('.vue')) files.push(full);
    });
}(root));

const offenders = [];
let sizes = 0;
let sizeTokens = 0;
let spacings = 0;
files.forEach((file) => {
    const rel = path.relative(root, file);
    if (rel === 'css/_globals.scss') return;
    fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n').split('\n').forEach((line, i) => {
        const where = `${rel}:${i + 1}  ${line.trim().slice(0, 90)}`;
        const fs1 = /^\s*font-size\s*:\s*(.+?)\s*(!important)?\s*;/.exec(line);
        if (fs1) {
            sizes += 1;
            const value = fs1[1];
            if (/^\$fontSize-[a-z0-9]+$/.test(value)) sizeTokens += 1;
            else if (/^\d+px$/.test(value) && !line.includes('font-size-exempt')) offenders.push(where);
        }
        const ls = /^\s*letter-spacing\s*:\s*(.+?)\s*;/.exec(line);
        if (ls) {
            spacings += 1;
            if (!/^(\$letterSpacing-[a-z]+|0|normal|inherit)$/.test(ls[1]) && !line.includes('font-size-exempt')) offenders.push(where);
        }
    });
});

assert(sizes > 80, `the scan read the font sizes (${sizes})`);
assert(sizeTokens > 60, `the font sizes use the tokens (${sizeTokens})`);
assert.deepStrictEqual(offenders, [], `write a $fontSize-* or $letterSpacing-* token:\n  ${offenders.join('\n  ')}`);

const globals = fs.readFileSync(path.join(root, 'css/_globals.scss'), 'utf8');
['2xs', 'xs', 'sm', 'ui', 'base', 'md', 'lg', 'xl', '2xl', '3xl', '4xl'].forEach((n) => {
    assert(new RegExp(`\\$fontSize-${n}:\\s*\\d+px;`).test(globals), `$fontSize-${n} is defined`);
});
['tight', 'display', 'loose', 'caps', 'wide'].forEach((n) => {
    assert(new RegExp(`\\$letterSpacing-${n}:`).test(globals), `$letterSpacing-${n} is defined`);
});

console.log(`unit-font-scale: ok (${sizes} sizes, ${sizeTokens} on tokens, ${spacings} letter-spacings)`);
