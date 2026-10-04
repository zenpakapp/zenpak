'use strict';

const { Library } = require('../client/models/library.js');
const libraryMutations = require('../client/store/mutations-library.js');
const { findForkUpdate } = require('../client/utils/fork-updates.js');

let passed = 0; let failed = 0;
function assert(desc, cond) {
    if (cond) { console.log(`  PASS  ${desc}`); passed++; }
    else { console.error(`  FAIL  ${desc}`); failed++; }
}

console.log('\n--- findForkUpdate ---');
const list = { id: 7, forkedFrom: { externalId: 'src1', version: 1 } };
const updates = [{ listId: 7, sourceExternalId: 'src1', forkedVersion: 1, latestVersion: 2 }];
assert('returns the entry for a fork behind its source', findForkUpdate(list, updates) === updates[0]);
assert('matches list ids across number/string', findForkUpdate({ ...list, id: '7' }, updates) === updates[0]);
assert('null when no entry for this list', findForkUpdate({ ...list, id: 8 }, updates) === null);
assert('null when the list is not a fork', findForkUpdate({ id: 7, forkedFrom: null }, updates) === null);
assert('null for a null list', findForkUpdate(null, updates) === null);
assert('null when updates is not an array', findForkUpdate(list, undefined) === null);
assert('null when the entry is not newer', findForkUpdate(list, [{ ...updates[0], latestVersion: 1 }]) === null);
const dismissedV2 = { id: 7, forkedFrom: { externalId: 'src1', version: 1, dismissedVersion: 2 } };
assert('null once that version was dismissed', findForkUpdate(dismissedV2, updates) === null);
const v3 = findForkUpdate(dismissedV2, [{ ...updates[0], latestVersion: 3 }]);
assert('a newer version than the dismissed one shows again', Boolean(v3) && v3.latestVersion === 3);

console.log('\n--- dismissForkUpdate ---');
const state = { library: new Library() };
const forkList = state.library.newList();
forkList.forkedFrom = { externalId: 'src1', version: 1, itemLinks: [{ categoryId: 1, itemId: 2, sourceItemId: 3 }] };
const before = forkList.forkedFrom;
libraryMutations.dismissForkUpdate(state, { listId: forkList.id, version: 2 });
assert('stores the dismissed version', forkList.forkedFrom.dismissedVersion === 2);
assert('keeps the other fork fields', forkList.forkedFrom.version === 1 && forkList.forkedFrom.itemLinks.length === 1);
assert('replaces the forkedFrom object for reactivity', forkList.forkedFrom !== before);
const plainList = state.library.newList();
libraryMutations.dismissForkUpdate(state, { listId: plainList.id, version: 2 });
assert('no-op on a list without forkedFrom', plainList.forkedFrom === null);
libraryMutations.dismissForkUpdate(state, { listId: 999999, version: 2 });
assert('no-op on an unknown list id', true);

console.log('\n--- list.versioning i18n ---');
const versioningKeys = [
    'updateBadge', 'bannerText', 'viewOriginal', 'dismiss', 'viewChanges', 'diffTitle', 'diffLoading', 'diffError', 'diffEmpty',
    'diffBaseWeight', 'diffItemCount', 'diffAdded', 'diffRemoved', 'diffMoved', 'diffModified', 'diffCategoriesRenamed',
    'diffListDetails', 'diffAffiliate',
];
const diffFieldKeys = [
    'name', 'description', 'brand', 'shop', 'weight', 'price', 'qty', 'worn', 'consumable', 'star', 'imageUrl', 'image',
    'publicUrl', 'promoCode', 'promoLabel', 'seasons', 'listTypes',
];
['en', 'fr', 'de', 'es'].forEach((locale) => {
    const messages = require(`../client/locales/${locale}.json`);
    const block = messages.list && messages.list.versioning;
    assert(`${locale} has every list.versioning key`, Boolean(block) && versioningKeys.every((key) => typeof block[key] === 'string' && block[key].length > 0));
    assert(`${locale} keeps the {version} placeholder`, Boolean(block) && block.updateBadge.includes('{version}') && block.bannerText.includes('{version}'));
    assert(`${locale} keeps the {from}/{to} placeholders`, Boolean(block) && typeof block.diffTitle === 'string' && block.diffTitle.includes('{from}') && block.diffTitle.includes('{to}'));
    assert(`${locale} has every diff field label`, Boolean(block && block.diffFields) && diffFieldKeys.every((key) => typeof block.diffFields[key] === 'string' && block.diffFields[key].length > 0));
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
