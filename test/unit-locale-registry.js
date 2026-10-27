/**
 * Unit test: every language in shared/locales.js is complete, and no file keeps its own copy of the
 * list of languages. Adding a language to the registry fails here until everything it needs exists,
 * and the failure names what is missing.
 * Run with: node test/unit-locale-registry.js
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
    LOCALES, SUPPORTED_LOCALES, DEFAULT_LOCALE, normalizeLocale,
} = require('../shared/locales.js');
const { TEXTS } = require('../server/moderation-notice-texts.js');

const ROOT = path.join(__dirname, '..');

function flatten(object, prefix = '') {
    return Object.entries(object).flatMap(([key, value]) => (
        value && typeof value === 'object' ? flatten(value, `${prefix}${key}.`) : [`${prefix}${key}`]
    ));
}

const readJson = (file) => JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'));

// The registry itself.
assert.ok(SUPPORTED_LOCALES.includes(DEFAULT_LOCALE), 'the default language is one of the languages');
assert.strictEqual(new Set(SUPPORTED_LOCALES).size, LOCALES.length, 'no language is listed twice');
for (const { code, name } of LOCALES) {
    assert.ok(/^[a-z]{2}$/.test(code), `${code}: a language code is two lowercase letters (browsers send fr-FR, matched on the first two)`);
    assert.ok(name && name.trim(), `${code}: the picker needs the language written in itself`);
}
assert.strictEqual(normalizeLocale('fr-FR'), 'fr');
assert.strictEqual(normalizeLocale(' DE '), 'de');
assert.strictEqual(normalizeLocale('xx'), null);
assert.strictEqual(normalizeLocale(undefined), null);

// What each language needs.
const missing = [];
const clientReference = new Set(flatten(readJson(`client/locales/${DEFAULT_LOCALE}.json`)));
const serverReference = new Set(flatten(readJson(`server/locales/${DEFAULT_LOCALE}.json`)));
const noticeReference = Object.keys(TEXTS[DEFAULT_LOCALE] || {}).sort().join(',');
for (const { code } of LOCALES) {
    const clientFile = `client/locales/${code}.json`;
    const serverFile = `server/locales/${code}.json`;
    if (!fs.existsSync(path.join(ROOT, clientFile))) missing.push(`${clientFile} (the app's messages)`);
    else {
        const keys = new Set(flatten(readJson(clientFile)));
        const lacking = [...clientReference].filter((key) => !keys.has(key));
        if (lacking.length) missing.push(`${clientFile}: ${lacking.length} keys missing, first: ${lacking.slice(0, 3).join(', ')}`);
    }
    if (!fs.existsSync(path.join(ROOT, serverFile))) missing.push(`${serverFile} (CSV and share page labels)`);
    else {
        const keys = new Set(flatten(readJson(serverFile)));
        const lacking = [...serverReference].filter((key) => !keys.has(key));
        if (lacking.length) missing.push(`${serverFile}: keys missing: ${lacking.join(', ')}`);
    }
    if (!TEXTS[code]) missing.push(`server/moderation-notice-texts.js: a "${code}" block (moderation emails)`);
    else if (Object.keys(TEXTS[code]).sort().join(',') !== noticeReference) missing.push(`server/moderation-notice-texts.js: "${code}" does not have the same notices as "${DEFAULT_LOCALE}"`);
}
assert.deepStrictEqual(missing, [], `A language in shared/locales.js is incomplete:\n${missing.join('\n')}`);

// No second copy of the list: the registry is the only place that names the languages.
const copies = [];
const walk = (dir) => fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).forEach((entry) => {
    const relative = path.join(dir, entry.name);
    if (entry.isDirectory()) {
        if (entry.name !== 'locales') walk(relative);
    } else if (/\.(js|vue)$/.test(entry.name)) {
        const text = fs.readFileSync(path.join(ROOT, relative), 'utf8');
        if (/\[\s*'en'\s*,\s*'(fr|de|es)'/.test(text) || /hreflang="(fr|de|es)"/.test(text)) copies.push(relative);
    }
});
['client', 'server'].forEach(walk);
assert.deepStrictEqual(copies, [], `These files list the languages themselves, read shared/locales.js instead:\n${copies.join('\n')}`);

console.log('unit-locale-registry: ok');
