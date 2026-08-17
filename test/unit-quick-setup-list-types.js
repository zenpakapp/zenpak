/**
 * Unit test: applyQuickSetup (client/utils/quick-setup.js) threads a Template's
 * listTypes through onto the seeded List, so Template-selected Lists are
 * pre-tagged for Community discovery without the user opening the Share dialog.
 * Run with: node test/unit-quick-setup-list-types.js
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

const { applyQuickSetup } = require('../client/utils/quick-setup.js');

function fixtureLibraryData() {
    return {
        defaultListId: 1,
        lists: [{ id: 1, name: 'My List', categoryIds: [] }],
    };
}

console.log('\n--- applyQuickSetup sets listTypes on the seeded List ---');

const withTypes = applyQuickSetup(fixtureLibraryData(), { listTypes: ['business'] });
assert('firstList.listTypes is set from setup.listTypes', JSON.stringify(withTypes.lists[0].listTypes) === JSON.stringify(['business']));

const withMultipleTypes = applyQuickSetup(fixtureLibraryData(), { listTypes: ['travel', 'business'] });
assert('firstList.listTypes preserves multiple values', JSON.stringify(withMultipleTypes.lists[0].listTypes) === JSON.stringify(['travel', 'business']));

console.log('\n--- applyQuickSetup defaults listTypes to [] when absent ---');

const withoutTypes = applyQuickSetup(fixtureLibraryData(), {});
assert('firstList.listTypes defaults to [] when setup has no listTypes', Array.isArray(withoutTypes.lists[0].listTypes) && withoutTypes.lists[0].listTypes.length === 0);

const withUndefinedSetup = applyQuickSetup(fixtureLibraryData(), undefined);
assert('firstList.listTypes defaults to [] when setup is undefined', Array.isArray(withUndefinedSetup.lists[0].listTypes) && withUndefinedSetup.lists[0].listTypes.length === 0);

console.log('\n--- applyQuickSetup preserves an existing List\'s listTypes when setup provides none ---');

function fixtureLibraryDataWithExistingTags() {
    return {
        defaultListId: 1,
        lists: [{ id: 1, name: 'My List', categoryIds: [], listTypes: ['weekend'] }],
    };
}

const dismissedWithExistingTags = applyQuickSetup(fixtureLibraryDataWithExistingTags(), {});
assert(
    'firstList.listTypes is NOT wiped when setup.listTypes is absent (e.g. dismissing the Template Picker on an already-tagged local List)',
    JSON.stringify(dismissedWithExistingTags.lists[0].listTypes) === JSON.stringify(['weekend']),
);

const selectedTemplateOverridesExistingTags = applyQuickSetup(fixtureLibraryDataWithExistingTags(), { listTypes: ['business'] });
assert(
    'firstList.listTypes IS overridden when setup.listTypes is explicitly provided (e.g. selecting a Template)',
    JSON.stringify(selectedTemplateOverridesExistingTags.lists[0].listTypes) === JSON.stringify(['business']),
);

console.log('\n--- applyQuickSetup still sets listName as before (no regression) ---');

const nameStillWorks = applyQuickSetup(fixtureLibraryData(), { listName: 'Renamed', listTypes: ['weekend'] });
assert('firstList.name is still set from setup.listName', nameStillWorks.lists[0].name === 'Renamed');

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
