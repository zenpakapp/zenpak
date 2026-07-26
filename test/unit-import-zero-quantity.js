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

    console.log(`\n${passed} passed, ${failed} failed`);
    process.exit(failed > 0 ? 1 : 0);
}

run();
