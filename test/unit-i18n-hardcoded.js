/**
 * Unit test: user-facing copy in .vue templates goes through vue-i18n.
 *  - no hardcoded text nodes or title/placeholder/aria-label/alt attributes
 *  - the four locale files declare the same keys
 * Run with: node test/unit-i18n-hardcoded.js
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const CLIENT = path.join(__dirname, '..', 'client');

// Admin-only tooling stays in English, register.vue is only reachable through a redirect.
const SKIPPED_FILES = new Set([
    'views/moderation.vue',
    'components/community-moderation.vue',
    'views/register.vue',
]);

// Brand and proper nouns that are not translated.
const ALLOWED_TEXT = new Set([
    'ZenPak', 'LighterPack', 'Kin', 'Wayfarer', 'Markdown', 'fxbenard', 'kg', 'g', 'oz', 'lb',
    'Made with ❤️ ZenPak', 'Made with ♥ ZenPak',
]);
const ALLOWED_ATTRS = new Set(['views/welcome.vue: alt="ZenPak"']);

function vueFiles(dir) {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) return vueFiles(full);
        return entry.name.endsWith('.vue') ? [full] : [];
    });
}

function flatten(obj, prefix = '') {
    return Object.entries(obj).flatMap(([key, value]) => (
        value && typeof value === 'object' ? flatten(value, `${prefix}${key}.`) : [`${prefix}${key}`]
    ));
}

const textRe = />([^<>{}]*[A-Za-zÀ-ÿ]{2,}[^<>{}]*)</g;
const attrRe = /\s(title|placeholder|aria-label|alt|label)="([^"]*[A-Za-z]{2,}[^"]*)"/g;

const found = [];
for (const file of vueFiles(CLIENT)) {
    const rel = path.relative(CLIENT, file);
    if (SKIPPED_FILES.has(rel)) continue;
    const src = fs.readFileSync(file, 'utf8');
    const match = src.match(/<template>([\s\S]*)<\/template>\s*(?:<script|<style|$)/);
    if (!match) continue;
    const tpl = match[1];

    for (const m of tpl.matchAll(textRe)) {
        const text = m[1].replace(/&\w+;/g, ' ').split(/\s+/).filter(Boolean).join(' ');
        if (!text || ALLOWED_TEXT.has(text) || /^[\W\d_]*$/.test(text)) continue;
        found.push(`${rel}: text "${text}"`);
    }
    for (const m of tpl.matchAll(attrRe)) {
        const entry = `${rel}: ${m[1]}="${m[2]}"`;
        if (!ALLOWED_ATTRS.has(entry)) found.push(entry);
    }
}
assert.deepStrictEqual(found, [], `Hardcoded copy in templates, use $t():\n${found.join('\n')}`);

const locales = ['en', 'fr', 'de', 'es'].map((code) => ({
    code,
    keys: new Set(flatten(JSON.parse(fs.readFileSync(path.join(CLIENT, 'locales', `${code}.json`), 'utf8')))),
}));
const reference = locales[0];
for (const locale of locales.slice(1)) {
    const missing = [...reference.keys].filter((k) => !locale.keys.has(k));
    assert.deepStrictEqual(missing, [], `${locale.code}.json is missing keys present in en.json:\n${missing.join('\n')}`);
}

console.log('ok');
