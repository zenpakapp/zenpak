'use strict';

const { Library } = require('../client/models/library.js');
const {
    GEAR_CATEGORY_OPTIONS, GEAR_CATEGORY_IDS, gearCategoryLabel, resolveGearCategory,
} = require('../client/data/gear-categories');
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

console.log('\n--- gear type ids ---');
assert('options are a non-empty list of { id, label }', Array.isArray(GEAR_CATEGORY_OPTIONS) && GEAR_CATEGORY_OPTIONS.length > 0
    && GEAR_CATEGORY_OPTIONS.every((option) => option.id && option.label));
assert('ids are unique', new Set(GEAR_CATEGORY_IDS).size === GEAR_CATEGORY_IDS.length);
assert('ids are lowercase slugs', GEAR_CATEGORY_IDS.every((id) => /^[a-z]+(-[a-z]+)*$/.test(id)));
assert('the canonical ids exist', GEAR_CATEGORY_IDS.includes('pack-bags') && GEAR_CATEGORY_IDS.includes('other') && GEAR_CATEGORY_IDS.includes('electronics'));
assert('the label of pack-bags is Pack & Bags', gearCategoryLabel('pack-bags') === 'Pack & Bags');
assert('an unknown id has no label', gearCategoryLabel('nope') === '' && gearCategoryLabel('') === '' && gearCategoryLabel(undefined) === '');

console.log('\n--- resolveGearCategory fuzzy matching ---');
assert('"Shelter" resolves to shelter', resolveGearCategory('Shelter') === 'shelter');
assert('"hygiene stuff" resolves to hygiene', resolveGearCategory('hygiene stuff') === 'hygiene');
assert('"sleeping bag" resolves to sleep', resolveGearCategory('sleeping bag') === 'sleep');
assert('"water bottle" resolves to water', resolveGearCategory('water bottle') === 'water');
assert('"pack" resolves to pack-bags', resolveGearCategory('pack') === 'pack-bags');
assert('the label "Pack & Bags" resolves to pack-bags', resolveGearCategory('Pack & Bags') === 'pack-bags');
assert('an id resolves to itself', GEAR_CATEGORY_IDS.every((id) => resolveGearCategory(id) === id));
assert('"Électronique" (accent stripped) resolves to empty', resolveGearCategory('Électronique') === '');
assert('"Truc" resolves to empty', resolveGearCategory('Truc') === '');
assert('empty string resolves to empty', resolveGearCategory('') === '');
assert('undefined resolves to empty', resolveGearCategory(undefined) === '');
assert('"COOK" (case-insensitive) resolves to cook', resolveGearCategory('COOK') === 'cook');

console.log('\n--- Library.load migration (fuzzy matching) ---');
function buildLibrary(category) {
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
    return library;
}

function loadItemCategory(category) {
    return buildLibrary(category).getItemById(101).category;
}

assert('migration turns a saved label into its id (Sleep)', loadItemCategory('Sleep') === 'sleep');
assert('migration keeps a near-match lowercase value (shelter)', loadItemCategory('shelter') === 'shelter');
assert('migration drops a non-type value (Electronique)', loadItemCategory('Electronique') === '');
assert('migration drops a non-mappable value (Truc)', loadItemCategory('Truc') === '');
assert('migration keeps an empty category', loadItemCategory('') === '');

// Idempotence: re-loading the migrated data must not change it further.
function reloadedCategory(category) {
    const library = buildLibrary(category);
    const first = library.getItemById(101).category;
    const serialized = JSON.parse(JSON.stringify(library.save()));
    library.load(serialized);
    const second = library.getItemById(101).category;
    return { first, second };
}

const idempotent = reloadedCategory('Electronique');
assert('migration is idempotent (no change on re-load)', idempotent.first === idempotent.second && idempotent.first === '');

console.log('\n--- CSV import resolves category to a type id ---');
function importCategory(category) {
    const state = { library: new Library(), globalAlerts: [] };
    importMutations.importCSV(state, {
        name: 'Import',
        data: [{ name: 'Item', category, description: '', qty: 1, weight: 10, unit: 'g', price: 0, worn: false, consumable: false }],
    });
    return state.library.items.find((item) => item.name === 'Item').category;
}

assert('CSV "Shelter" imports as shelter', importCategory('Shelter') === 'shelter');
assert('CSV "hygiene stuff" imports as hygiene', importCategory('hygiene stuff') === 'hygiene');
assert('CSV "Truc" imports as empty', importCategory('Truc') === '');

console.log('\n--- a saved id stays an id ---');
assert('migration keeps an id (pack-bags)', loadItemCategory('pack-bags') === 'pack-bags');
const again = reloadedCategory('Pack & Bags');
assert('a saved label becomes the id and stays the same on re-load', again.first === 'pack-bags' && again.second === 'pack-bags');

console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
