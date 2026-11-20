/**
 * Unit test: copying a public list whose source has two lines for the same gear in one Category.
 * The signature merge folds both lines into one local Item: the Category keeps a single Placement
 * and the quantities add up, so the copied list weighs what the source weighs.
 * Run with: node test/unit-import-public-list-fold.js
 */

'use strict';

const { Library } = require('../client/models/library.js');
const mutations = require('../client/store/mutations-import.js');

let passed = 0;
let failed = 0;
function assert(desc, cond) {
    if (cond) { console.log(`  PASS  ${desc}`); passed++; } else { console.error(`  FAIL  ${desc}`); failed++; }
}

function line(extra) {
    return { name: 'AAA battery', description: '', brand: 'Duracell', weight: 11, qty: 2, worn: 0, consumable: false, star: 0, ...extra };
}

function placementsOf(library, list) {
    return list.categoryIds
        .map((id) => library.getCategoryById(id))
        .flatMap((category) => category.categoryItems.map((placement) => ({ category, placement })));
}

console.log('\n--- two source lines fold into one local Item: one Placement, quantities added ---');
{
    const library = new Library();
    // The Library already holds the gear the source lines describe: the signature merge reuses it.
    const owned = library.newItem({ category: library.getCategoryById(library.getListById(library.defaultListId).categoryIds[0]) });
    Object.assign(owned, { name: 'AAA battery', description: '', brand: 'Duracell', weight: 11 });

    const state = { library, globalAlerts: [], loggedIn: 'bob' };
    mutations.importPublicList(state, {
        listName: 'Copy',
        description: '',
        categories: [{ name: 'Power', categoryItems: [line({ qty: 2 }), line({ qty: 3 })] }],
    });
    const copied = library.lists[library.lists.length - 1];
    const entries = placementsOf(library, copied);

    assert('one Placement in the copied Category', entries.length === 1);
    assert('it points at the reused Item', entries[0].placement.itemId === owned.id);
    assert('the quantities add up (2 + 3)', entries[0].placement.qty === 5);
}

console.log('\n--- distinct lines are not folded ---');
{
    const library = new Library();
    const state = { library, globalAlerts: [], loggedIn: 'bob' };
    mutations.importPublicList(state, {
        listName: 'Copy',
        description: '',
        categories: [{ name: 'Power', categoryItems: [line({ name: 'AAA battery', qty: 2 }), line({ name: 'Power bank', brand: 'Anker', weight: 200, qty: 1 })] }],
    });
    const copied = library.lists[library.lists.length - 1];
    const entries = placementsOf(library, copied);

    assert('two Placements', entries.length === 2);
    assert('each keeps its own quantity', entries.map((e) => e.placement.qty).sort().join() === '1,2');
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
