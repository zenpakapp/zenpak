/**
 * Unit test: spacing comes from the scale. In the style sheets and the components, padding, margin and
 * gap take a $space-N step (2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 40, 48), a 1px hairline or 0.
 * A larger layout size stays allowed when the line says `space-exempt` in a comment.
 * The four old tokens ($spacingSmaller, …) are gone.
 * Run with: node test/unit-spacing-scale.js
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '../client');
const PROP = /^\s*(?:padding|margin|gap|row-gap|column-gap)(?:-(?:top|right|bottom|left|inline|block)(?:-(?:start|end))?)?\s*:\s*(.+?);/;
const PX = /(?<![\w$.#-])-?(\d+(?:\.\d+)?)px(?![\w-])/g;

function styleLines(file) {
    const text = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n').split('\n');
    if (file.endsWith('.scss')) return text.map((line, i) => ({ line, n: i + 1 }));
    const out = [];
    let inside = false;
    text.forEach((line, i) => {
        if (line.includes('<style')) { inside = true; return; }
        if (line.includes('</style>')) inside = false;
        if (inside) out.push({ line, n: i + 1 });
    });
    return out;
}

const files = [];
(function walk(dir) {
    fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.name.endsWith('.scss') || entry.name.endsWith('.vue')) files.push(full);
    });
}(root));

const offenders = [];
let scanned = 0;
let onScale = 0;
files.forEach((file) => {
    const rel = path.relative(root, file);
    if (rel === 'css/_globals.scss' || rel === 'css/_theme-vars.scss') return;
    styleLines(file).forEach(({ line, n }) => {
        if (/\$spacing(Smaller|Small|Medium|Large)\b/.test(line)) offenders.push(`${rel}:${n}  old token  ${line.trim()}`);
        if (/(^|[^(\w$])-\$space-/.test(line)) offenders.push(`${rel}:${n}  negative step needs parentheses, Sass reads "0 -$x" as a subtraction  ${line.trim()}`);
        const m = PROP.exec(line);
        if (!m || m[1].includes('calc(')) return;
        scanned += 1;
        if (m[1].includes('$space-')) onScale += 1;
        if (line.includes('space-exempt')) return;
        let px;
        PX.lastIndex = 0;
        while ((px = PX.exec(m[1])) !== null) {
            if (Number(px[1]) > 1) offenders.push(`${rel}:${n}  ${line.trim().slice(0, 90)}`);
        }
    });
});

assert(scanned > 800, `the scan read the spacing declarations (${scanned})`);
assert(onScale > 700, `the declarations use the scale (${onScale})`);
assert.deepStrictEqual(offenders, [], `write a $space-N step, not a pixel value:\n  ${offenders.join('\n  ')}`);

const globals = fs.readFileSync(path.join(root, 'css/_globals.scss'), 'utf8');
[2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 40, 48].forEach((s) => {
    assert(new RegExp(`^\\$space-${s}: ${s}px;`, 'm').test(globals), `$space-${s} is defined`);
});

console.log(`unit-spacing-scale: ok (${scanned} declarations, ${onScale} on the scale)`);
