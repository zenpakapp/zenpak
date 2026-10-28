'use strict';

/**
 * Unit test: reviewing an ambiguous imported item offers a choice of direction. "merge" keeps the
 * existing item as it is, "update" merges into the existing item and takes the imported details,
 * "new" keeps both.
 * Run with: node test/unit-import-merge-update.js
 */

const { Library } = require('../client/models/library.js');
const mutations = require('../client/store/mutations-import.js');

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

function importWithDecision(decision, row = {}) {
    const state = { library: new Library(), globalAlerts: [] };
    state.library.itemUnit = 'g';
    const existing = state.library.newItem({});
    existing.name = 'Poulie';
    existing.description = 'Tandem Speed';
    existing.brand = 'Petzl';
    existing.weight = 80000;
    existing.authorUnit = 'g';
    existing.price = 0;
    existing.url = '';

    mutations.importCSV(state, {
        name: 'Imported list',
        data: [{
            name: 'Tandem Speed',
            description: 'Poulie',
            brand: 'Petzl',
            category: 'Safety',
            qty: 1,
            weight: 85,
            unit: 'g',
            price: 60,
            url: 'https://example.com/tandem',
            worn: false,
            consumable: false,
            ...row,
            match: { item: existing, score: 0.7, decision },
        }],
    });
    return { state, existing };
}

const kept = importWithDecision('merge');
assert('merge keeps the existing name', kept.existing.name === 'Poulie');
assert('merge keeps the existing description', kept.existing.description === 'Tandem Speed');
assert('merge keeps the existing weight', kept.existing.weight === 80000);
assert('merge adds no new item', kept.state.library.items.length === 1);

const updated = importWithDecision('update');
assert('update takes the imported name', updated.existing.name === 'Tandem Speed');
assert('update takes the imported description', updated.existing.description === 'Poulie');
assert('update takes the imported weight', updated.existing.weight === 85000);
assert('update takes the imported price and link', updated.existing.price === 60 && updated.existing.url === 'https://example.com/tandem');
assert('update adds no new item', updated.state.library.items.length === 1);
const list = updated.state.library.getListById(updated.state.library.defaultListId);
const category = updated.state.library.getCategoryById(list.categoryIds[0]);
assert('update places the existing item in the imported list', category.categoryItems[0].itemId === updated.existing.id);

const partial = importWithDecision('update', { description: '', brand: '', price: 0, url: '', weight: 0 });
assert('update never blanks a detail the import does not have', partial.existing.description === 'Tandem Speed'
    && partial.existing.brand === 'Petzl' && partial.existing.weight === 80000 && partial.existing.url === '');

const both = importWithDecision('new');
assert('keep both creates a second item', both.state.library.items.length === 2);
assert('keep both leaves the existing item untouched', both.existing.name === 'Poulie');

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
