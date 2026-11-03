/**
 * Unit test: the Wayfarer items section has one row per item (not per list), sends only the rows
 * the user edited, and filters by text, list and state.
 * Run with: node test/unit-guide-items.js
 */

'use strict';

const assert = require('assert');
const {
    buildItemRows, changedUpdates, markSaved, filterRows,
} = require('../client/utils/guide-items.js');

const item = (itemId, name, extra = {}) => ({
    itemId, name, brand: '', affiliateUrl: '', promoCode: '', promoLabel: '', appliedRule: null, ...extra,
});
const groups = [
    { listId: 'a', listName: 'Alps', items: [item('1', 'Tent', { brand: 'Zpacks' }), item('2', 'Stove')] },
    { listId: 'b', listName: 'Pyrenees', items: [item('1', 'Tent', { brand: 'Zpacks' }), item('3', 'Poles', { affiliateUrl: 'https://x.test/p' })] },
    { listId: 'c', listName: 'Empty', items: [] },
];

// One row per item, the lists it is used in kept in order.
const rows = buildItemRows(groups);
assert.deepStrictEqual(rows.map((row) => row.itemId), ['1', '2', '3']);
assert.deepStrictEqual(rows[0].lists.map((list) => list.listId), ['a', 'b'], 'a shared item lists both lists');
assert.strictEqual(buildItemRows(undefined).length, 0);

// Nothing edited, nothing sent. An edit on a shared item is sent once, with one of its lists.
assert.deepStrictEqual(changedUpdates(rows), []);
rows[0].promoCode = 'SAVE10';
assert.deepStrictEqual(changedUpdates(rows), [{
    listId: 'a', itemId: '1', affiliateUrl: '', promoCode: 'SAVE10', promoLabel: '',
}]);
markSaved(rows);
assert.deepStrictEqual(changedUpdates(rows), [], 'saved rows are no longer sent');

// Clearing a field is a change too.
rows[2].affiliateUrl = '';
assert.strictEqual(changedUpdates(rows).length, 1);
assert.strictEqual(changedUpdates(rows)[0].itemId, '3');
markSaved(rows);

// Filters.
const names = (list) => list.map((row) => row.name);
assert.deepStrictEqual(names(filterRows(rows, { query: 'zpa' })), ['Tent'], 'search reads the brand too');
assert.deepStrictEqual(names(filterRows(rows, { listId: 'b' })), ['Tent', 'Poles']);
assert.deepStrictEqual(names(filterRows(rows, { listId: 'a', query: 'stove' })), ['Stove']);
assert.deepStrictEqual(names(filterRows(rows, { mode: 'filled' })), ['Tent']);
assert.deepStrictEqual(names(filterRows(rows, { mode: 'todo' })), ['Stove', 'Poles']);
rows[1].appliedRule = 'brand:MSR';
assert.deepStrictEqual(names(filterRows(rows, { mode: 'rule' })), ['Stove']);
assert.deepStrictEqual(names(filterRows(rows, { mode: 'todo' })), ['Poles'], 'an item a rule covers is not "to do"');
assert.strictEqual(filterRows(rows).length, 3);

console.log('unit-guide-items: ok');
