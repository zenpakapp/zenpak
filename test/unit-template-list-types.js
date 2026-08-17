/**
 * Unit test, array-driven: every entry in useTemplatePicker.js's `templates`
 * array must (1) load cleanly through Library.load(), (2) declare listTypes
 * values that all exist in the shared List Type source, and (3) have a
 * name/description in every supported locale. Extends automatically as new
 * Templates are added — no test-file changes needed.
 * Run with: node test/unit-template-list-types.js
 */

'use strict';

let passed = 0;
let failed = 0;

function assert(description, condition) {
    if (condition) {
        console.log(`  PASS  ${description}`);
        passed++;
    } else {
        console.error(`  FAIL  ${description}`);
        failed++;
    }
}

const { templates } = require('../client/composables/useTemplatePicker.js');
const { LIST_TYPE_VALUES } = require('../client/data/list-type-options.js');
const { Library } = require('../client/models/library.js');

const LOCALES = ['en', 'fr', 'es', 'de'];
const knownListTypes = LIST_TYPE_VALUES.map((t) => t.value);

console.log(`\n--- ${templates.length} templates load via Library.load() ---`);

for (const template of templates) {
    let loaded = false;
    try {
        new Library().load(template.data);
        loaded = true;
    } catch (err) {
        loaded = false;
    }
    assert(`${template.id}: data loads via Library.load() without error`, loaded);
}

console.log('\n--- every template.listTypes value is a known List Type ---');

for (const template of templates) {
    assert(`${template.id}: listTypes is an array`, Array.isArray(template.listTypes));
    const unknown = (template.listTypes || []).filter((value) => !knownListTypes.includes(value));
    assert(`${template.id}: listTypes values are all known (${JSON.stringify(template.listTypes)})`, unknown.length === 0);
}

console.log('\n--- every template has a name/description in every locale ---');

for (const locale of LOCALES) {
    const localeData = require(`../client/locales/${locale}.json`);
    const entries = (localeData.library && localeData.library.templatePickerTemplates) || {};
    for (const template of templates) {
        const entry = entries[template.id];
        assert(`${locale}: ${template.id}.name is a non-empty string`, !!(entry && typeof entry.name === 'string' && entry.name.trim()));
        assert(`${locale}: ${template.id}.description is a non-empty string`, !!(entry && typeof entry.description === 'string' && entry.description.trim()));
    }
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
