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
const tent = library.newItem({});
tent.name = 'Tent';
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

// With removeUnusedItems, the items only that list used leave the gear room; an item another list
// still uses stays, and so does a gear room item no list ever used.
const keep = (name) => {
    const item = library.newItem({});
    item.name = name;
    return item;
};
const onlyHere = keep('Only here');
const shared = keep('Shared');
const unused = keep('Never in a list');
const third = library.newList();
const thirdCategory = library.newCategory({ list: third });
thirdCategory.addItem({ itemId: onlyHere.id, qty: 1 });
thirdCategory.addItem({ itemId: shared.id, qty: 1 });
library.getCategoryById(library.lists[0].categoryIds[0]).addItem({ itemId: shared.id, qty: 1 });

library.removeList(third.id);
assert.ok(library.getItemById(onlyHere.id), 'without the option every item stays');

const fourth = library.newList();
const fourthCategory = library.newCategory({ list: fourth });
fourthCategory.addItem({ itemId: onlyHere.id, qty: 1 });
fourthCategory.addItem({ itemId: shared.id, qty: 1 });
library.removeList(fourth.id, { removeUnusedItems: true });
assert.strictEqual(library.getItemById(onlyHere.id), undefined, 'an item no other list uses is deleted');
assert.ok(library.getItemById(shared.id), 'an item another list uses stays');
assert.ok(library.getItemById(unused.id), 'an item that was never in this list is untouched');
assert.ok(library.getItemById(tent.id), 'the items of other deleted lists are untouched');
assert.ok(!library.items.some((item) => item.id === onlyHere.id), 'it is gone from the item list too');

// Blank placeholder rows never pile up in the gear room, option or not; a named item still stays.
const fifth = library.newList();
const fifthCategory = library.newCategory({ list: fifth });
const blank = library.newItem({ category: fifthCategory });
const named = library.newItem({ category: fifthCategory });
named.name = 'Named';
library.removeList(fifth.id);
assert.strictEqual(library.getItemById(blank.id), undefined, 'a blank item of a deleted list is purged');
assert.ok(library.getItemById(named.id), 'a named item of a deleted list stays');

console.log('unit-remove-list: ok');
