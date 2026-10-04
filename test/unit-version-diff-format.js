'use strict';

const { formatDiffValue, isEmptyDiff } = require('../client/utils/version-diff-format.js');

let passed = 0; let failed = 0;
function assert(desc, cond) {
    if (cond) { console.log(`  PASS  ${desc}`); passed++; }
    else { console.error(`  FAIL  ${desc}`); failed++; }
}

console.log('\n--- formatDiffValue ---');
assert('weight in mg shown in the item unit', formatDiffValue('weight', 900000, { itemUnit: 'g' }) === '900 g');
assert('weight 0 is shown, not a dash', formatDiffValue('weight', 0, { itemUnit: 'g' }) === '0 g');
assert('price uses the source currency', formatDiffValue('price', 20, { currencySymbol: '€' }) === '20.00€');
assert('consumable true is a check mark', formatDiffValue('consumable', true) === '✓');
assert('consumable false is a dash', formatDiffValue('consumable', false) === '—');
assert('arrays are joined', formatDiffValue('seasons', ['summer', 'fall']) === 'summer, fall');
assert('empty array is a dash', formatDiffValue('seasons', []) === '—');
assert('empty string is a dash', formatDiffValue('brand', '') === '—');
assert('undefined is a dash', formatDiffValue('brand', undefined) === '—');
assert('numbers are stringified', formatDiffValue('qty', 2) === '2');
assert('text is kept', formatDiffValue('name', 'Tent') === 'Tent');

console.log('\n--- friendly values ---');
const t = (key) => `T:${key}`;
assert('worn 1 is a check mark', formatDiffValue('worn', 1) === '✓');
assert('worn 0 is a dash', formatDiffValue('worn', 0) === '—');
assert('star 1 is a check mark', formatDiffValue('star', 1) === '✓');
assert('star 0 is a dash', formatDiffValue('star', 0) === '—');
assert('seasons are translated', formatDiffValue('seasons', ['summer', '3-season'], { t }) === 'T:list.seasonSummer, T:list.season3');
assert('list types are translated', formatDiffValue('listTypes', ['trek', 'day-hike'], { t }) === 'T:list.typeThru, T:list.typeDay');
assert('an unknown slug stays as is', formatDiffValue('seasons', ['monsoon'], { t }) === 'monsoon');
assert('seasons without a translator stay raw', formatDiffValue('seasons', ['summer']) === 'summer');

console.log('\n--- isEmptyDiff ---');
const none = {
    added: [], removed: [], moved: [], modified: [], categoriesRenamed: [], meta: [], totals: {},
};
assert('no entries is empty', isEmptyDiff(none) === true);
assert('null is empty', isEmptyDiff(null) === true);
assert('one added item is not empty', isEmptyDiff({ ...none, added: [{}] }) === false);
assert('one meta change is not empty', isEmptyDiff({ ...none, meta: [{}] }) === false);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
