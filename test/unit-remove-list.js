/**
 * Unit test: deleting a list takes every one of its categories with it (none is left behind in the
 * library), keeps the items in the gear room, and leaves the other lists alone. The last list stays.
 * Run with: node test/unit-remove-list.js
 */

'use strict';

const assert = require('assert');
const { Library } = require('../client/models/library.js');

const library = new Library();
const first = library.lists[0];
const second = library.newList();
for (let n = 0; n < 5; n++) {
    library.newCategory({ list: second }).name = `second-${n}`;
}
const tent = library.newItem({ name: 'Tent', weight: 1000 });
library.getCategoryById(second.categoryIds[0]).addItem({ itemId: tent.id, qty: 1 });

const secondCategoryIds = [...second.categoryIds];
const firstCategoryIds = [...first.categoryIds];
const categoriesBefore = library.categories.length;
assert.strictEqual(secondCategoryIds.length, 5);

library.removeList(second.id);

assert.strictEqual(library.lists.length, 1, 'the list is gone');
assert.deepStrictEqual(secondCategoryIds.filter((id) => library.getCategoryById(id)), [], 'no category of the deleted list is left behind');
assert.strictEqual(library.categories.length, categoriesBefore - 5, 'exactly its categories were removed');
assert.deepStrictEqual(first.categoryIds, firstCategoryIds, 'the other list keeps its categories');
assert.ok(library.getItemById(tent.id), 'the items stay in the gear room');
assert.strictEqual(library.defaultListId, first.id, 'the default list falls back to a list that exists');

// The last list cannot be deleted.
library.removeList(first.id);
assert.strictEqual(library.lists.length, 1);

console.log('unit-remove-list: ok');
