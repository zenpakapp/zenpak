'use strict';

const { createListVersionsStub, buildOwnerUser, stubServerModule } = require('./fixtures/list-versions-fixtures.js');

stubServerModule('db.js', { listVersions: createListVersionsStub() });

const {
    buildFrozenLibrary, hashFrozenLibrary, computeTotals, normalizeNote,
} = require('../server/list-versions.js');

let passed = 0; let failed = 0;
function assert(desc, cond) {
    if (cond) { console.log(`  PASS  ${desc}`); passed++; }
    else { console.error(`  FAIL  ${desc}`); failed++; }
}

const owner = buildOwnerUser();
const frozen = buildFrozenLibrary(owner.library, 'abc123');

console.log('\n--- buildFrozenLibrary ---');
assert('returns null for an unknown externalId', buildFrozenLibrary(owner.library, 'nope') === null);
assert('returns null for an empty externalId', buildFrozenLibrary(owner.library, '') === null);
assert('contains exactly the one requested list', frozen.lists.length === 1 && frozen.lists[0].externalId === 'abc123');
assert('contains only the list categories', frozen.categories.map((c) => c.id).join() === '5,6');
assert('contains only the items placed in those categories', frozen.items.map((i) => i.id).sort().join() === '11,12');
assert('does not leak copiedBy', !('copiedBy' in frozen.lists[0]));
assert('does not leak copyCount', !('copyCount' in frozen.lists[0]));
assert('does not leak aiAnalysis', !('aiAnalysis' in frozen.lists[0]));
assert('keeps whitelisted list fields', frozen.lists[0].name === 'PCT' && frozen.lists[0].publicFields.price === true && frozen.lists[0].seasons[0] === 'summer');
assert('keeps only the display name from the public profile', JSON.stringify(frozen.publicProfile) === JSON.stringify({ displayName: 'Alice A' }));
assert('keeps only the plan from entitlements', JSON.stringify(frozen.entitlements) === JSON.stringify({ plan: 'trail' }));
assert('keeps creator affiliate settings', frozen.creator.disclosure === 'Affiliate links inside');
assert('defaultListId points at the frozen list', frozen.defaultListId === 1);
frozen.items[0].name = 'MUTATED';
assert('frozen library is a deep copy of the live library', owner.library.items[0].name === 'Tent');
const fresh = buildFrozenLibrary(owner.library, 'abc123');

console.log('\n--- hashFrozenLibrary ---');
assert('hash is deterministic', hashFrozenLibrary(fresh) === hashFrozenLibrary(buildFrozenLibrary(owner.library, 'abc123')));
const shareToggled = buildFrozenLibrary(owner.library, 'abc123');
shareToggled.lists[0].visibility = 'shareable';
shareToggled.lists[0].copyable = true;
shareToggled.lists[0].allowSearchIndexing = true;
assert('hash ignores visibility, copyable and allowSearchIndexing', hashFrozenLibrary(shareToggled) === hashFrozenLibrary(fresh));
const heavier = buildFrozenLibrary(owner.library, 'abc123');
heavier.items[0].weight += 1;
assert('hash changes when an item weight changes', hashFrozenLibrary(heavier) !== hashFrozenLibrary(fresh));
const renamed = buildFrozenLibrary(owner.library, 'abc123');
renamed.lists[0].name = 'PCT v2';
assert('hash changes when the list name changes', hashFrozenLibrary(renamed) !== hashFrozenLibrary(fresh));
const publicFieldChanged = buildFrozenLibrary(owner.library, 'abc123');
publicFieldChanged.lists[0].publicFields.price = false;
assert('hash ignores publicFields toggles (applies live, like visibility)', hashFrozenLibrary(publicFieldChanged) === hashFrozenLibrary(fresh));

const beforeUnrelatedEdit = buildFrozenLibrary(owner.library, 'abc123');
owner.library.sequence += 7; // simulates creating an item/category/list anywhere else in the account
const afterUnrelatedEdit = buildFrozenLibrary(owner.library, 'abc123');
assert('hash ignores the account-wide sequence counter', hashFrozenLibrary(afterUnrelatedEdit) === hashFrozenLibrary(beforeUnrelatedEdit));
owner.library.sequence -= 7;

const beforeUnitChange = buildFrozenLibrary(owner.library, 'abc123');
owner.library.itemUnit = 'oz';
const afterUnitChange = buildFrozenLibrary(owner.library, 'abc123');
assert('hash ignores a global itemUnit preference change', hashFrozenLibrary(afterUnitChange) === hashFrozenLibrary(beforeUnitChange));
owner.library.itemUnit = 'g';

console.log('\n--- computeTotals ---');
const totals = computeTotals(fresh);
assert('qty sums placement quantities', totals.qty === 3);
assert('base weight sums weight x qty in mg', totals.baseWeight === 900000 + 2 * 100000);
assert('total weight equals base weight when nothing is worn or consumable', totals.totalWeight === totals.baseWeight);
assert('computeTotals does not mutate its input', fresh.lists[0].totalBaseWeight === undefined);

console.log('\n--- normalizeNote ---');
assert('trims whitespace', normalizeNote('  hi  ') === 'hi');
assert('non-strings become empty', normalizeNote(undefined) === '' && normalizeNote(42) === '');
assert('truncates to 200 chars', normalizeNote('x'.repeat(500)).length === 200);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
