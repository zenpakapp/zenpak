/**
 * Unit test: the rules of copying a public list, without a database or a route.
 * Run with: node test/unit-copy-list-rules.js
 */

'use strict';

const assert = require('assert');
const { canCopy, buildCopyPayload } = require('../server/copy-list-rules.js');

const owner = { _id: 'o1', username: 'owner', library: { publicProfile: { displayName: 'Owner Name' } } };
const user = { _id: 'u1', username: 'member' };
const list = (extra) => ({ externalId: 'ext1', name: 'My list', visibility: 'discoverable', ...extra });

const no = (status, message) => ({ ok: false, status, message });

// --- canCopy
assert.deepStrictEqual(canCopy({ owner, sourceList: list(), user }), { ok: true }, 'discoverable: copyable');
assert.deepStrictEqual(canCopy({ owner, sourceList: list({ visibility: 'indexable' }), user }), { ok: true }, 'indexable: copyable');
assert.deepStrictEqual(canCopy({ owner, sourceList: list({ visibility: 'shareable', copyable: true }), user }), { ok: true }, 'shareable with copyable: copyable');

assert.deepStrictEqual(canCopy({ owner, sourceList: list({ visibility: 'shareable' }), user }), no(404, 'List not found'), 'shareable without copyable: 404, not revealed');
assert.deepStrictEqual(canCopy({ owner, sourceList: list({ visibility: 'shareable', copyable: 'yes' }), user }), no(404, 'List not found'), 'copyable must be exactly true');
assert.deepStrictEqual(canCopy({ owner, sourceList: list({ visibility: 'private' }), user }), no(404, 'List not found'), 'private: 404');
assert.deepStrictEqual(canCopy({ owner, sourceList: undefined, user }), no(404, 'List not found'), 'no such list: 404');
assert.deepStrictEqual(canCopy({ owner: null, sourceList: list(), user }), no(404, 'List not found'), 'no owner: 404');
assert.deepStrictEqual(canCopy({ owner: { ...owner, banned: true }, sourceList: list(), user }), no(404, 'List not found'), 'banned owner: 404');
assert.deepStrictEqual(canCopy({ owner, sourceList: list(), user: { ...user, _id: 'o1' } }), no(403, 'Cannot copy your own list'), 'own list: 403');
assert.deepStrictEqual(canCopy({ owner, sourceList: list(), user: { ...user, banned: true } }), no(403, 'Account suspended'), 'banned member: 403');
// Order: a hidden list answers 404 even to a banned member, and the owner's own hidden list too.
assert.deepStrictEqual(canCopy({ owner, sourceList: list({ visibility: 'private' }), user: { ...user, banned: true } }), no(404, 'List not found'), '404 comes before 403');

// --- buildCopyPayload
const version = (publicFields, extraList) => ({
    version: 4,
    library: {
        currencySymbol: '€',
        lists: [{ name: 'Published name', description: 'desc', categoryIds: [10], publicFields, seasons: ['summer'], ...extraList }],
        categories: [
            { id: 10, name: 'Sleep', categoryItems: [{ itemId: 1, qty: 2, worn: 1, star: 1 }, { itemId: 99, qty: 1 }, { itemId: 2, qty: 'x', consumable: true }] },
            { id: 11, name: 'Not in the list', categoryItems: [{ itemId: 1 }] },
        ],
        items: [
            { id: 1, name: 'Tent', weight: 1200, price: 300, brand: 'B' },
            { id: 2, name: 'Food', weight: '50', authorUnit: 'oz', price: 5 },
        ],
    },
});
const now = new Date('2026-01-02T03:04:05.000Z');

const withPrice = buildCopyPayload({ version: version({ price: true }), owner, sourceList: list(), now });
assert.strictEqual(withPrice.listName, 'Published name', 'published name wins');
assert.strictEqual(withPrice.sourceCurrencySymbol, '€');
assert.deepStrictEqual(withPrice.seasons, ['summer']);
assert.deepStrictEqual(withPrice.categories.map((c) => c.name), ['Sleep'], 'only the list\'s own categories');
const items = withPrice.categories[0].categoryItems;
assert.deepStrictEqual(items.map((i) => i.sourceItemId), [1, 2], 'an Item that is missing from the library is skipped');
assert.strictEqual(items[0].price, 300, 'price is copied when the author shares it');
assert.strictEqual(items[0].qty, 2);
assert.strictEqual(items[1].qty, 1, 'a quantity that is not a number becomes 1');
assert.strictEqual(items[1].consumable, true);
assert.strictEqual(items[1].authorUnit, 'oz');
assert.strictEqual(items[1].weight, 50, 'weight is a number');

const hidden = buildCopyPayload({ version: version({}), owner, sourceList: list(), now });
assert.strictEqual(hidden.categories[0].categoryItems[0].price, 0, 'price is hidden when not shared');

assert.deepStrictEqual(withPrice.forkedFrom, {
    externalId: 'ext1',
    ownerId: 'o1',
    ownerUsername: 'owner',
    ownerName: 'Owner Name',
    listName: 'Published name',
    sourceCurrencySymbol: '€',
    copiedAt: '2026-01-02T03:04:05.000Z',
    version: 4,
}, 'forkedFrom names the source and the published version');

const fallback = buildCopyPayload({ version: version({}, { name: '' }), owner: { ...owner, library: {} }, sourceList: list(), now });
assert.strictEqual(fallback.listName, 'My list', 'falls back to the owner\'s list name');
assert.strictEqual(fallback.forkedFrom.ownerName, 'owner', 'falls back to the username');

console.log('unit-copy-list-rules: ok');
