'use strict';

/**
 * Unit test: the gear matcher (client/composables/useGearMatcher.js) recognises the same product
 * whatever the user writes in the name or the description, and never merges silently two
 * different brands.
 * Run with: node test/unit-gear-matcher.js
 */

const {
    scoreMatch,
    findBestMatch,
    suggestItems,
    THRESHOLD_AUTO_MERGE,
    THRESHOLD_AMBIGUOUS,
} = require('../client/composables/useGearMatcher.js');

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

const g = (grams) => grams * 1000;
const pulley = { name: 'Tandem Speed', description: 'Poulie', brand: 'Petzl', weight: g(80) };

// Same convention: merged silently.
assert('same name, brand and weight merge', findBestMatch(
    { name: 'Tandem Speed', description: 'Poulie', brand: 'Petzl' },
    [pulley],
    g(80),
).decision === 'merge');

// Inverted convention (function as name, model as description): still the same product.
const inverted = findBestMatch({ name: 'Poulie', description: 'Tandem Speed', brand: 'Petzl' }, [pulley], g(80));
assert('inverted name and description still merge', inverted.decision === 'merge' && inverted.item === pulley);

// Model buried in a longer description.
assert('the model in a longer description is at least offered for review', findBestMatch(
    { name: 'Poulie', description: 'Tandem Speed Petzl', brand: 'Petzl' },
    [pulley],
    g(80),
).decision !== 'new');

// Unrelated item stays new.
assert('an unrelated item stays new', findBestMatch(
    { name: 'Casque', description: 'Vector', brand: 'Black Diamond' },
    [pulley],
    g(300),
).decision === 'new');

// Generic names: two brands never merge silently, even with the same name and weight.
const quiltEe = { name: 'Quilt', description: '', brand: 'Enlightened Equipment', weight: g(650) };
const brandClash = scoreMatch({ name: 'Quilt', description: '', brand: 'Aegismax' }, quiltEe, g(650));
assert('same name and weight but different brands is below auto-merge', brandClash < THRESHOLD_AUTO_MERGE);
assert('...yet still offered for review', brandClash >= THRESHOLD_AMBIGUOUS);

// A missing brand on one side does not block a merge.
assert('a missing brand does not block a merge', findBestMatch(
    { name: 'Quilt', description: '', brand: '' },
    [quiltEe],
    g(650),
).decision === 'merge');

// Autocomplete finds an item by its description or brand, not only its name.
const library = [
    { name: 'Lunar Solo', description: 'Tente, sans piquets', brand: 'Six Moon Designs' },
    { name: 'Vector', description: 'Casque', brand: 'Black Diamond' },
];
assert('typing the function finds the model', suggestItems('tente', library)[0] === library[0]);
assert('typing the brand finds the item', suggestItems('black', library)[0] === library[1]);
assert('typing a name still ranks it first', suggestItems('vector', library)[0] === library[1]);
assert('a word nowhere in the item finds nothing', suggestItems('xylophone', library).length === 0);

// Typing a brand must not list unrelated items that only look alike by chance.
const gearRoom = [
    { name: 'Batterie externe', brand: 'Nitecore', weight: g(280), category: 'Electronics' },
    { name: 'Batterie externe', brand: 'Nitecore', weight: g(150), category: 'Electronics' },
    { name: 'Frontale', brand: 'Nitecore', weight: g(34), category: 'Electronics' },
    { name: 'Porte-gourde', brand: '', weight: 0, category: 'Water' },
    { name: 'Debit card', brand: '', weight: g(5), category: 'Essentials' },
    { name: 'Vector', description: 'Casque', brand: 'Black Diamond', weight: g(240), category: 'Safety' },
];
const nitecore = suggestItems('nitecore', gearRoom, 'Electronics');
assert('a brand lists only that brand\'s items', nitecore.length === 3 && nitecore.every((i) => i.brand === 'Nitecore'));
assert('a category boost never rescues an unrelated item', suggestItems('nitecore', gearRoom, 'Water').every((i) => i.brand === 'Nitecore'));
assert('one typo in a word still finds the item', suggestItems('nitcore', gearRoom).length === 3);
assert('a typo in a full name still finds it', suggestItems('Frontal', gearRoom)[0] === gearRoom[2]);
assert('unrelated letters find nothing', suggestItems('zqxw', gearRoom).length === 0);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
