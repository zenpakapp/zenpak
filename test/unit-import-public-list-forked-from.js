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
        sourceCurrencySymbol: '$',
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
    assert('source currency preserved on fork', newList.forkedFrom.sourceCurrencySymbol === '$');
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
        sourceCurrencySymbol: '€',
        forkedFrom: {
            externalId: 'metric-source',
            ownerUsername: 'alice',
            listName: 'Metric source',
        },
        categories: [{
            name: 'Shelter',
            categoryItems: [{
                name: 'Tent',
                description: '',
                weight: 925000,
                authorUnit: 'g',
                url: 'https://example.com/tent',
                affiliateUrl: 'https://example.com/tent?ref=alice',
                promoCode: 'ALICE10',
                promoLabel: '10% off',
                qty: 1,
            }],
        }],
    });
    const copiedItem = unitState.library.items.find(item => item.name === 'Tent');
    assert('public copy keeps source weight as mg', copiedItem && copiedItem.weight === 925000);
    assert('public copy uses recipient library item unit', copiedItem && copiedItem.authorUnit === 'kg');
    assert('public copy preserves product URL', copiedItem && copiedItem.url === 'https://example.com/tent');
    assert('public copy preserves affiliate URL', copiedItem && copiedItem.affiliateUrl === 'https://example.com/tent?ref=alice');
    assert('public copy preserves promo code', copiedItem && copiedItem.promoCode === 'ALICE10');
    assert('public copy preserves promo label', copiedItem && copiedItem.promoLabel === '10% off');
    assert('source currency copied into fork metadata fallback', unitState.library.lists[unitState.library.lists.length - 1].forkedFrom.sourceCurrencySymbol === '€');

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

    const linkState = { library: new Library(), globalAlerts: [], loggedIn: 'bob' };
    const existingStove = linkState.library.newItem({});
    existingStove.name = 'Stove';
    existingStove.brand = 'BRS';
    existingStove.weight = 25000;
    mutations.importPublicList(linkState, {
        listName: 'Linked source',
        description: '',
        forkedFrom: { externalId: 'src1', ownerUsername: 'alice', listName: 'Linked source', version: 3 },
        categories: [
            {
                sourceCategoryId: 50,
                name: 'Shelter',
                categoryItems: [
                    { sourceItemId: 101, name: 'Tent', weight: 900000, qty: 1 },
                    { sourceItemId: 102, name: 'Stake', weight: 8000, qty: 6 },
                ],
            },
            {
                sourceCategoryId: 60,
                name: 'Cook',
                categoryItems: [
                    { sourceItemId: 103, name: 'Stove', brand: 'BRS', weight: 25000, qty: 1 },
                    { sourceItemId: 104, name: 'Stake', weight: 8000, qty: 2 },
                ],
            },
        ],
    });
    const linkedList = linkState.library.lists[linkState.library.lists.length - 1];
    const links = linkedList.forkedFrom.itemLinks || [];
    const linkFor = (sourceItemId) => links.find((link) => link.sourceItemId === sourceItemId) || {};
    assert('fork keeps the copied version', linkedList.forkedFrom.version === 3);
    assert('one item link per imported placement', links.length === 4);
    assert('item links point at local categories of the new list', links.length > 0 && links.every((link) => linkedList.categoryIds.includes(link.categoryId)));
    assert('a new item is linked to its source item', Boolean(linkFor(101).itemId) && linkState.library.getItemById(linkFor(101).itemId).name === 'Tent');
    assert('an item merged into an existing local item is linked too', linkFor(103).itemId === existingStove.id);
    assert('two source items merged into one local item keep both links', Boolean(linkFor(102).itemId) && linkFor(102).itemId === linkFor(104).itemId && linkFor(102).categoryId !== linkFor(104).categoryId);
    assert('category links map local categories to source categories', JSON.stringify((linkedList.forkedFrom.categoryLinks || []).map((link) => link.sourceCategoryId)) === JSON.stringify([50, 60]));
    assert('category links use the new list category ids', (linkedList.forkedFrom.categoryLinks || []).length === 2 && linkedList.forkedFrom.categoryLinks.every((link) => linkedList.categoryIds.includes(link.categoryId)));

    const legacyState = { library: new Library(), globalAlerts: [], loggedIn: 'bob' };
    mutations.importPublicList(legacyState, {
        listName: 'Old server',
        description: '',
        forkedFrom: { externalId: 'src2', ownerUsername: 'alice', listName: 'Old server' },
        categories: [{ name: 'Shelter', categoryItems: [{ name: 'Tarp', weight: 300000, qty: 1 }] }],
    });
    const legacyList = legacyState.library.lists[legacyState.library.lists.length - 1];
    assert('a payload without version stores no links', !('itemLinks' in legacyList.forkedFrom) && !('categoryLinks' in legacyList.forkedFrom) && !('version' in legacyList.forkedFrom));

    console.log(`\n${passed} passed, ${failed} failed`);
    process.exit(failed > 0 ? 1 : 0);
}
run();
