'use strict';

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

function run() {
    const state = { library: new Library(), globalAlerts: [] };
    mutations.importCSV(state, {
        name: 'Quantity test',
        data: [
            {
                name: 'Stored item',
                category: 'Clothing',
                description: '',
                qty: 0,
                weight: 100,
                unit: 'g',
                price: 0,
                worn: false,
                consumable: false,
            },
            {
                name: 'Default quantity item',
                category: 'Clothing',
                description: '',
                qty: undefined,
                weight: 200,
                unit: 'g',
                price: 0,
                worn: false,
                consumable: false,
            },
        ],
    });

    const list = state.library.getListById(state.library.defaultListId);
    const category = state.library.getCategoryById(list.categoryIds[0]);

    assert('CSV import preserves a zero quantity', category.categoryItems[0].qty === 0);
    assert('CSV import defaults an invalid quantity to one', category.categoryItems[1].qty === 1);

    const dedupState = { library: new Library(), globalAlerts: [] };
    dedupState.library.itemUnit = 'g';
    const existing = dedupState.library.newItem({});
    existing.name = 'Headlamp';
    existing.description = 'Bindi';
    existing.brand = 'Petzl';
    existing.weight = 33000;
    existing.authorUnit = 'g';
    existing.price = 55;

    mutations.importCSV(dedupState, {
        name: 'LighterPack import',
        data: [
            {
                name: 'Headlamp',
                category: 'Electronique',
                description: 'Simond UL 500 - 100lm',
                qty: 1,
                weight: 42,
                unit: 'g',
                price: 20,
                worn: false,
                consumable: false,
                brand: '',
                _match: { decision: 'new', item: existing, score: 0.6 },
            },
        ],
    });

    const imported = dedupState.library.items.find(item => item.description === 'Simond UL 500 - 100lm');
    const importedList = dedupState.library.getListById(dedupState.library.defaultListId);
    const importedCategory = dedupState.library.getCategoryById(importedList.categoryIds[0]);

    assert('CSV import respects a new dedup decision for same-name gear', dedupState.library.items.length === 2);
    assert('CSV import keeps the imported same-name item details', imported && imported.price === 20);
    assert('CSV import links the imported same-name item to the list', imported && importedCategory.categoryItems[0].itemId === imported.id);

    console.log(`\n${passed} passed, ${failed} failed`);
    process.exit(failed > 0 ? 1 : 0);
}

run();
