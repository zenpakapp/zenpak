'use strict';

/**
 * Unit test: the Gear Room offers "Create <search>" only when a search finds nothing.
 * Run with: node test/unit-gear-room-create-from-search.js
 */

const { newItemNameFromSearch } = require('../client/services/gear-room-filters.js');

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

console.log('\n--- newItemNameFromSearch ---');
assert('a search with no result offers its text as the name', newItemNameFromSearch('Zpacks Duplex', 0) === 'Zpacks Duplex');
assert('the text is trimmed', newItemNameFromSearch('  tent  ', 0) === 'tent');
assert('inner spacing is collapsed', newItemNameFromSearch('big   agnes  tent', 0) === 'big agnes tent');
assert('nothing is offered while there are results', newItemNameFromSearch('tent', 3) === '');
assert('nothing is offered for an empty search', newItemNameFromSearch('', 0) === '');
assert('nothing is offered for a blank search', newItemNameFromSearch('   ', 0) === '');
assert('null and undefined are treated as empty', newItemNameFromSearch(null, 0) === '' && newItemNameFromSearch(undefined, 0) === '');
assert('a non-string query does not throw', newItemNameFromSearch(42, 0) === '42');

console.log('\n--- search text is normalised like the offered name ---');
const { buildSearchableItems, filterSearchableItems } = require('../client/services/gear-room-filters.js');

const searchable = buildSearchableItems([
    { id: 1, name: 'Zzquux spork', description: '', brand: '' },
    { id: 2, name: 'Alpine stove', description: 'light', brand: 'Acme' },
]);
const names = (query) => filterSearchableItems(searchable, query).map((item) => item.name);
assert('an exact query matches', names('zzquux spork').join() === 'Zzquux spork');
assert('surrounding spaces do not hide a match', names('  zzquux spork ').join() === 'Zzquux spork');
assert('extra inner spaces do not hide a match', names('zzquux    spork').join() === 'Zzquux spork');
assert('an empty or blank query matches everything', names('').length === 2 && names('   ').length === 2);
assert('a name created from the offer matches the search that produced it', names(newItemNameFromSearch('  Zzquux   spork ', 0)).length === 1);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
