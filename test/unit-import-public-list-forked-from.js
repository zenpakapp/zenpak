// test/unit-import-public-list-forked-from.js
'use strict';

const { Library } = require('../client/models/library.js');
const mutations = require('../client/store/mutations-import.js');

let passed = 0; let failed = 0;
function assert(desc, cond) {
    if (cond) { console.log(`  PASS  ${desc}`); passed++; }
    else { console.error(`  FAIL  ${desc}`); failed++; }
}

function run() {
    const forkedFrom = {
        externalId: 'gr34-summer',
        ownerId: '507f1f77bcf86cd799439011',
        ownerUsername: 'fx',
        ownerName: 'FX Bénard',
        listName: 'GR34 Summer',
        copiedAt: '2026-07-16T21:00:00.000Z',
    };

    const state = { library: new Library(), globalAlerts: [], loggedIn: 'bob' };
    mutations.importPublicList(state, {
        listName: 'GR34 Summer',
        description: 'A great trail.',
        seasons: ['3-season', 'summer'],
        listTypes: ['trek', 'weekend'],
        categories: [],
        forkedFrom,
    });
    const newList = state.library.lists[state.library.lists.length - 1];
    assert('new list created', Boolean(newList));
    assert('external fork uses source list name', newList.name === 'GR34 Summer');
    assert('forkedFrom assigned on new list', JSON.stringify(newList.forkedFrom) === JSON.stringify(forkedFrom));
    assert('community seasons copied', JSON.stringify(newList.seasons) === JSON.stringify(['3-season', 'summer']));
    assert('community list types copied', JSON.stringify(newList.listTypes) === JSON.stringify(['trek', 'weekend']));
    assert('copied list stays private by default', newList.visibility === 'private');
    assert('copied list does not inherit copy permission', newList.copyable === false);
    assert('copied list does not inherit public fields', typeof newList.publicFields === 'undefined');

    // Defensive: payload without forkedFrom (e.g. stale client/server mismatch) must not crash.
    const state2 = { library: new Library(), globalAlerts: [], loggedIn: 'bob' };
    mutations.importPublicList(state2, { listName: 'No Fork', description: '', categories: [] });
    const newList2 = state2.library.lists[state2.library.lists.length - 1];
    assert('forkedFrom defaults to null when payload omits it', newList2.forkedFrom === null);
    assert('copy without fork metadata keeps copy prefix', newList2.name === 'Copy of No Fork');

    const unitState = { library: new Library(), globalAlerts: [] };
    unitState.library.itemUnit = 'kg';
    mutations.importPublicList(unitState, {
        listName: 'Metric source',
        description: '',
        categories: [{
            name: 'Shelter',
            categoryItems: [{
                name: 'Tent',
                description: '',
                weight: 925000,
                authorUnit: 'g',
                qty: 1,
            }],
        }],
    });
    const copiedItem = unitState.library.items.find(item => item.name === 'Tent');
    assert('public copy keeps source weight as mg', copiedItem && copiedItem.weight === 925000);
    assert('public copy uses recipient library item unit', copiedItem && copiedItem.authorUnit === 'kg');

    const variantState = { library: new Library(), globalAlerts: [] };
    mutations.importPublicList(variantState, {
        listName: 'Clothing variants',
        description: '',
        categories: [{
            name: 'Clothing',
            categoryItems: [
                {
                    name: 'T-shirt Merino Fresh',
                    description: 'T-shirt manches longues mérinos khaki',
                    brand: 'Simond',
                    weight: 184000,
                    qty: 1,
                },
                {
                    name: 'T-shirt Merino Fresh',
                    description: 'T-shirt manches courtes mérinos bleu',
                    brand: 'Simond',
                    weight: 148000,
                    qty: 1,
                },
            ],
        }],
    });
    const copiedVariants = variantState.library.items.filter(item => item.name === 'T-shirt Merino Fresh');
    assert('public copy keeps same-name variants separate', copiedVariants.length === 2);
    assert('public copy preserves second variant description', copiedVariants.some(item => item.description === 'T-shirt manches courtes mérinos bleu'));

    console.log(`\n${passed} passed, ${failed} failed`);
    process.exit(failed > 0 ? 1 : 0);
}
run();
