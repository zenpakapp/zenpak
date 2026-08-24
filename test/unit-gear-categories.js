'use strict';

const { Library } = require('../client/models/library.js');
const { GEAR_CATEGORIES, resolveGearCategory } = require('../client/data/gear-categories');
const importMutations = require('../client/store/mutations-import.js');

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

console.log('\n--- GEAR_CATEGORIES enum ---');
assert('enum is a non-empty array of strings', Array.isArray(GEAR_CATEGORIES) && GEAR_CATEGORIES.length > 0);
assert('enum contains the canonical values', GEAR_CATEGORIES.includes('Pack & Bags') && GEAR_CATEGORIES.includes('Other'));
assert('enum contains Electronics', GEAR_CATEGORIES.includes('Electronics'));

console.log('\n--- resolveGearCategory fuzzy matching ---');
assert('"Shelter" resolves to Shelter', resolveGearCategory('Shelter') === 'Shelter');
assert('"hygiene stuff" resolves to Hygiene', resolveGearCategory('hygiene stuff') === 'Hygiene');
assert('"sleeping bag" resolves to Sleep', resolveGearCategory('sleeping bag') === 'Sleep');
assert('"water bottle" resolves to Water', resolveGearCategory('water bottle') === 'Water');
assert('"pack" resolves to Pack & Bags', resolveGearCategory('pack') === 'Pack & Bags');
assert('"Électronique" (accent stripped) resolves to empty', resolveGearCategory('Électronique') === '');
assert('"Truc" resolves to empty', resolveGearCategory('Truc') === '');
assert('empty string resolves to empty', resolveGearCategory('') === '');
assert('undefined resolves to empty', resolveGearCategory(undefined) === '');
assert('"COOK" (case-insensitive) resolves to Cook', resolveGearCategory('COOK') === 'Cook');

console.log('\n--- Library.load migration (strict equality) ---');
function loadItemCategory(category) {
    const library = new Library();
    library.load({
        version: '0.3',
        totalUnit: 'g',
        itemUnit: 'g',
        defaultListId: 42,
        sequence: 10,
        optionalFields: {},
        items: [{ id: 101, name: 'Item', category }],
        categories: [{ id: 102, name: 'Cat', categoryItems: [{ itemId: 101, qty: 1, worn: 0, consumable: false, star: 0 }] }],
        lists: [{ id: 42, name: 'List', categoryIds: [102] }],
    });
    return library.getItemById(101).category;
}

assert('migration keeps an exact enum value (Sleep)', loadItemCategory('Sleep') === 'Sleep');
assert('migration drops a non-enum value (Electronique)', loadItemCategory('Electronique') === '');
assert('migration drops a near-match lowercase value (shelter)', loadItemCategory('shelter') === '');
assert('migration keeps an empty category', loadItemCategory('') === '');

// Idempotence: re-loading the migrated data must not change it further.
function reloadedCategory(category) {
    const library = new Library();
    library.load({
        version: '0.3',
        totalUnit: 'g',
        itemUnit: 'g',
        defaultListId: 42,
        sequence: 10,
        optionalFields: {},
        items: [{ id: 101, name: 'Item', category }],
        categories: [{ id: 102, name: 'Cat', categoryItems: [{ itemId: 101, qty: 1, worn: 0, consumable: false, star: 0 }] }],
        lists: [{ id: 42, name: 'List', categoryIds: [102] }],
    });
    const first = library.getItemById(101).category;
    const serialized = JSON.parse(JSON.stringify(library.save()));
    library.load(serialized);
    const second = library.getItemById(101).category;
    return { first, second };
}

const idempotent = reloadedCategory('Electronique');
assert('migration is idempotent (no change on re-load)', idempotent.first === idempotent.second && idempotent.first === '');

console.log('\n--- CSV import resolves category to enum ---');
function importCategory(category) {
    const state = { library: new Library(), globalAlerts: [] };
    importMutations.importCSV(state, {
        name: 'Import',
        data: [{ name: 'Item', category, description: '', qty: 1, weight: 10, unit: 'g', price: 0, worn: false, consumable: false }],
    });
    return state.library.items.find((item) => item.name === 'Item').category;
}

assert('CSV "Shelter" imports as Shelter', importCategory('Shelter') === 'Shelter');
assert('CSV "hygiene stuff" imports as Hygiene', importCategory('hygiene stuff') === 'Hygiene');
assert('CSV "Truc" imports as empty', importCategory('Truc') === '');

console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
