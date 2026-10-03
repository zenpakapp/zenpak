'use strict';

/**
 * Unit test: Gear Room view helpers build list/item usage indexes once.
 * Run with: node test/unit-gear-room-view.js
 */

const { Library } = require('../client/models/library.js');
const { buildItemUsageCounts, buildListItemIds } = require('../client/services/gear-room-view.js');

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

console.log('\n--- Gear Room item usage counts ---');

const library = new Library();
const firstList = library.getListById(library.defaultListId);
const firstCategory = library.getCategoryById(firstList.categoryIds[0]);
const secondCategory = library.newCategory({ list: firstList });
const secondList = library.newList();
const thirdCategory = library.newCategory({ list: secondList });
const sharedItem = library.newItem({});
const singleListItem = library.newItem({});
const orphanItem = library.newItem({});

firstCategory.addItem({ itemId: sharedItem.id });
secondCategory.addItem({ itemId: sharedItem.id });
thirdCategory.addItem({ itemId: sharedItem.id });
firstCategory.addItem({ itemId: singleListItem.id });

const firstListIds = buildListItemIds(library, firstList);
const usageCounts = buildItemUsageCounts(library);

assert('list item ids include shared item once', firstListIds.has(sharedItem.id) && firstListIds.size === 2);
assert('item in two lists counts as two', usageCounts.get(sharedItem.id) === 2);
assert('item in one list counts as one', usageCounts.get(singleListItem.id) === 1);
assert('orphan item has no usage count', !usageCounts.has(orphanItem.id));

console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
