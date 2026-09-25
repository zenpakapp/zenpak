'use strict';

/**
 * Unit test: editor metadata updates must not recalculate list totals.
 * Run with: node test/unit-editor-mutation-performance.js
 */

const { Library } = require('../client/dataTypes.js');
const mutations = require('../client/store/mutations-library.js');

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

function countCalculateTotals(list) {
    const original = list.calculateTotals.bind(list);
    let count = 0;
    list.calculateTotals = () => {
        count++;
        return original();
    };
    return () => count;
}

console.log('\n--- Editor mutation performance ---');

const library = new Library();
const listWithItem = library.getListById(library.defaultListId);
const categoryWithItem = library.getCategoryById(listWithItem.categoryIds[0]);
const item = library.newItem({ category: categoryWithItem });

const listWithoutItem = library.newList();
library.newCategory({ list: listWithoutItem });

const getWithItemRecalculateCount = countCalculateTotals(listWithItem);
const getWithoutItemRecalculateCount = countCalculateTotals(listWithoutItem);
const state = { library, itemVersion: 0 };

mutations.updateItemMetadata(state, { ...item, name: 'Updated name', tags: ['winter'] });

assert('metadata update increments item version', state.itemVersion === 1);
assert('metadata update does not recalculate containing list', getWithItemRecalculateCount() === 0);
assert('metadata update does not recalculate unrelated list', getWithoutItemRecalculateCount() === 0);

mutations.updateItem(state, { ...item, weight: 500000 });

assert('weight update increments item version', state.itemVersion === 2);
assert('weight update recalculates containing list', getWithItemRecalculateCount() === 1);
assert('weight update skips unrelated list', getWithoutItemRecalculateCount() === 0);

console.log('\n--- Shared item recalculation ---');

const sharedLibrary = new Library();
const sharedItem = sharedLibrary.newItem({});
const firstList = sharedLibrary.getListById(sharedLibrary.defaultListId);
const firstCategory = sharedLibrary.getCategoryById(firstList.categoryIds[0]);
firstCategory.addItem({ itemId: sharedItem.id, qty: 1 });
const secondList = sharedLibrary.newList();
const secondCategory = sharedLibrary.newCategory({ list: secondList });
secondCategory.addItem({ itemId: sharedItem.id, qty: 1 });
const unrelatedList = sharedLibrary.newList();
sharedLibrary.newCategory({ list: unrelatedList });

const getFirstRecalculateCount = countCalculateTotals(firstList);
const getSecondRecalculateCount = countCalculateTotals(secondList);
const getUnrelatedRecalculateCount = countCalculateTotals(unrelatedList);
const sharedState = { library: sharedLibrary, itemVersion: 0 };

mutations.updateItem(sharedState, { ...sharedItem, weight: 250000 });

assert('shared item update recalculates first list', getFirstRecalculateCount() === 1);
assert('shared item update recalculates second list', getSecondRecalculateCount() === 1);
assert('shared item update skips list without the item', getUnrelatedRecalculateCount() === 0);

console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
