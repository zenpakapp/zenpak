/**
 * Unit test: the style sheets and the style blocks of the components use the design tokens of
 * _globals.scss where a token exists, not the number behind it. It refuses:
 *   - font-size of 11, 12, 13, 14, 16, 18 or 22px (use $fontSize-xs, -sm, -ui, -base, -md, -lg, -xl),
 *   - a literal font-weight (use $fontWeight-*; inherit is allowed),
 *   - a z-index that is not a token, 0, 1, 2, -1 or auto,
 *   - color: #fff (use $color-on-solid),
 *   - the green focus-ring shadow written out (use $shadow-focus-ring),
 *   - a one-line transition with a duration in seconds (use $transitionDuration*).
 * Run with: node test/unit-design-tokens.js
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '../client');

const globals = fs.readFileSync(path.join(root, 'css/_globals.scss'), 'utf8');
[
    '$fontSize-xs: 11px', '$fontSize-sm: 12px', '$fontSize-ui: 13px', '$fontSize-base: 14px', '$fontSize-md: 16px',
    '$fontSize-lg: 18px', '$fontSize-xl: 22px', '$fontWeight-light: 300', '$fontWeight-normal: 400',
    '$fontWeight-medium: 500', '$fontWeight-bold: 600', '$dropdown: 40', '$aboveAll: 1000',
    '$color-on-solid: #fff', '$shadow-focus-ring: 0 0 0 4px',
].forEach((token) => assert(globals.includes(token), `${token} is defined in _globals.scss`));

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

const OFF_SCALE_SIZES = new Set(['11px', '12px', '13px', '14px', '16px', '18px', '22px']);
const Z_OK = new Set(['0', '1', '2', '-1', 'auto']);
const offenders = [];
let scanned = 0;

files.forEach((file) => {
    const rel = path.relative(root, file);
    if (rel === 'css/_globals.scss' || rel === 'css/_theme-vars.scss') return;
    styleLines(file).forEach(({ line, n }) => {
        const code = line.replace(/\/\/.*$/, '').trim();
        if (!code || code.startsWith('/*')) return;
        scanned += 1;
        let m;
        if ((m = /^font-size:\s*(\d+px);/.exec(code)) && OFF_SCALE_SIZES.has(m[1])) offenders.push(`${rel}:${n}  font-size: ${m[1]}`);
        if ((m = /^font-weight:\s*([^;]+);/.exec(code)) && !m[1].trim().startsWith('$') && m[1].trim() !== 'inherit') offenders.push(`${rel}:${n}  font-weight: ${m[1].trim()}`);
        if ((m = /^z-index:\s*([^;!]+)/.exec(code)) && !m[1].trim().startsWith('$') && !Z_OK.has(m[1].trim())) offenders.push(`${rel}:${n}  z-index: ${m[1].trim()}`);
        if (/^color:\s*#fff;/.test(code)) offenders.push(`${rel}:${n}  color: #fff`);
        if (/^box-shadow:\s*0 0 0 [34]px rgba\(var\(--color-accent-rgb\), 0\.(?:08|1|12|15|18)\);/.test(code)) offenders.push(`${rel}:${n}  the focus-ring shadow written out`);
        if ((m = /^transition(?:-duration)?:\s*(.*);/.exec(code)) && /(?<![\w.$-])\d*\.?\d+s\b/.test(m[1]) && !m[1].includes('$transition') && !/\b0s\b/.test(m[1])) offenders.push(`${rel}:${n}  transition: ${m[1].slice(0, 50)}`);
    });
});

assert(scanned > 3000, `the scan read the style rules (${scanned})`);
assert.deepStrictEqual(offenders, [], `use the design tokens:\n  ${offenders.join('\n  ')}`);

console.log(`unit-design-tokens: ok (${scanned} style lines, no literal where a token exists)`);
