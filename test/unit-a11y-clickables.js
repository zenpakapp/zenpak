/**
 * Unit test: a click on a div, li, span, td or tr must also work from the keyboard, and every img
 * has an alt. A clickable element that is not a button or a link needs role and tabindex (and a
 * key handler), or it is listed below with the reason it is a mouse-only shortcut.
 * Run with: node test/unit-a11y-clickables.js
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '../client');

// file -> number of tags allowed to be mouse-only, and why.
const MOUSE_ONLY = {
    'components/gear-room.vue': [6, 'row cells repeat the name cell, which has the keyboard path'],
    'components/lp-select.vue': [1, 'an option is picked with the arrow keys and Enter on the focused trigger'],
    'components/unit-select.vue': [2, 'a real, focusable <select> sits inside; the list is its mouse skin'],
    'components/item.vue': [1, 'row click only toggles the packed state, the checkbox has the keyboard path'],
    'components/library-lists.vue': [1, 'a wrapper that closes a menu; the menu buttons are real buttons'],
    'components/modal.vue': [1, 'backdrop; Escape closes the dialog'],
    'components/sidebar.vue': [1, 'backdrop; the hamburger button toggles the drawer'],
};

const files = [];
(function walk(dir) {
    fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.name.endsWith('.vue')) files.push(full);
    });
}(root));

const problems = [];
let imgs = 0;
files.forEach((file) => {
    const rel = path.relative(root, file).split(path.sep).join('/');
    const template = (fs.readFileSync(file, 'utf8').match(/<template[^>]*>([\s\S]*?)<\/template>\s*(?:<script|<style|$)/) || [, ''])[1];
    let mouseOnly = 0;
    [...template.matchAll(/<(div|li|span|td|tr|p|section|article|img)\b([^>]*)>/g)].forEach(([, tag, attrs]) => {
        if (tag === 'img') {
            imgs += 1;
            if (!/(^|\s):?alt=/.test(attrs)) problems.push(`${rel}: <img> without alt`);
            return;
        }
        const clicks = [...attrs.matchAll(/@click(\.[\w.]+)?=/g)];
        if (!clicks.length) return;
        // .self and .stop do not make a control: they guard a backdrop or keep a click from bubbling.
        if (clicks.every((c) => /\.(self|stop)\b/.test(c[1] || ''))) return;
        if (/\brole=/.test(attrs) && /\btabindex=/.test(attrs) && /@keydown\b/.test(attrs)) return;
        mouseOnly += 1;
    });
    const allowed = (MOUSE_ONLY[rel] || [0])[0];
    if (mouseOnly > allowed) problems.push(`${rel}: ${mouseOnly} clickable non-button tags, ${allowed} allowed (add role, tabindex and @keydown)`);
    if (mouseOnly < allowed) problems.push(`${rel}: only ${mouseOnly} mouse-only tags left, ${allowed} listed: lower the number in this test`);
});
Object.keys(MOUSE_ONLY).forEach((rel) => assert.ok(files.some((f) => path.relative(root, f).split(path.sep).join('/') === rel), `${rel} listed but missing`));

assert.deepStrictEqual(problems, [], `\n${problems.join('\n')}`);
console.log(`unit-a11y-clickables: ok (${files.length} files, ${imgs} images)`);
