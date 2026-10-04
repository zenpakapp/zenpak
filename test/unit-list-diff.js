'use strict';

const { diffSnapshots } = require('../server/list-diff.js');

let passed = 0; let failed = 0;
function assert(desc, cond) {
    if (cond) { console.log(`  PASS  ${desc}`); passed++; }
    else { console.error(`  FAIL  ${desc}`); failed++; }
}

function item(id, overrides = {}) {
    return {
        id,
        name: `Item ${id}`,
        description: '',
        brand: '',
        shop: '',
        weight: 1000,
        price: 0,
        image: '',
        imageUrl: '',
        publicUrl: '',
        promoCode: '',
        promoLabel: '',
        hasAffiliateLink: false,
        qty: 1,
        worn: 0,
        consumable: false,
        star: 0,
        ...overrides,
    };
}

function payload({ categories, list = {}, publicFields = { price: true, links: true, images: true } }) {
    return {
        list: {
            name: 'PCT', description: '', seasons: [], listTypes: [], totalBaseWeight: 0, totalQty: 0, ...list,
        },
        publicFields,
        categories,
    };
}

const base = payload({
    list: { totalBaseWeight: 3000, totalQty: 3 },
    categories: [
        { id: 5, name: 'Shelter', items: [item(11, { name: 'Tent', weight: 900 }), item(12, { name: 'Stake' })] },
        { id: 6, name: 'Cook', items: [item(13, { name: 'Stove' })] },
    ],
});

console.log('\n--- identical payloads ---');
const same = diffSnapshots(base, JSON.parse(JSON.stringify(base)));
assert('no added', same.added.length === 0);
assert('no removed', same.removed.length === 0);
assert('no moved', same.moved.length === 0);
assert('no modified', same.modified.length === 0);
assert('no renamed categories', same.categoriesRenamed.length === 0);
assert('no meta changes', same.meta.length === 0);
assert('totals carried from both sides', same.totals.baseWeightFrom === 3000 && same.totals.baseWeightTo === 3000 && same.totals.qtyFrom === 3 && same.totals.qtyTo === 3);

console.log('\n--- order is ignored ---');
const reordered = payload({
    list: { totalBaseWeight: 3000, totalQty: 3 },
    categories: [
        { id: 6, name: 'Cook', items: [item(13, { name: 'Stove' })] },
        { id: 5, name: 'Shelter', items: [item(12, { name: 'Stake' }), item(11, { name: 'Tent', weight: 900 })] },
    ],
});
const reorderedDiff = diffSnapshots(base, reordered);
assert('reordering items and categories reports nothing', reorderedDiff.added.length + reorderedDiff.removed.length + reorderedDiff.moved.length + reorderedDiff.modified.length === 0);

console.log('\n--- added / removed / moved / modified ---');
const next = payload({
    list: {
        name: 'PCT 2027', seasons: ['summer'], totalBaseWeight: 2500, totalQty: 4,
    },
    categories: [
        { id: 5, name: 'Shelter', items: [item(11, { name: 'Tent v2', weight: 850, qty: 2 }), item(13, { name: 'Stove' })] },
        { id: 6, name: 'Kitchen', items: [item(14, { name: 'Pot', brand: 'Toaks', weight: 120 })] },
    ],
});
const diff = diffSnapshots(base, next);
assert('new item is added with its category', diff.added.length === 1 && diff.added[0].item.id === 14 && diff.added[0].category.id === 6 && diff.added[0].category.name === 'Kitchen');
assert('added entry carries a short summary', diff.added[0].item.brand === 'Toaks' && diff.added[0].item.weight === 120 && diff.added[0].item.qty === 1 && !('publicUrl' in diff.added[0].item));
assert('missing item is removed with its base category', diff.removed.length === 1 && diff.removed[0].item.id === 12 && diff.removed[0].category.name === 'Shelter');
assert('item in another category is moved, not added/removed', diff.moved.length === 1 && diff.moved[0].item.id === 13 && diff.moved[0].fromCategory.id === 6 && diff.moved[0].toCategory.id === 5);
const tent = diff.modified.find((entry) => entry.item.id === 11);
assert('a renamed item stays the same item (matched by id)', Boolean(tent) && !diff.added.some((e) => e.item.id === 11) && !diff.removed.some((e) => e.item.id === 11));
const tentChange = (field) => tent && tent.changes.find((change) => change.field === field);
assert('name change reported', tentChange('name') && tentChange('name').from === 'Tent' && tentChange('name').to === 'Tent v2');
assert('weight change reported in mg', tentChange('weight') && tentChange('weight').from === 900 && tentChange('weight').to === 850);
assert('qty change reported', tentChange('qty') && tentChange('qty').from === 1 && tentChange('qty').to === 2);
assert('plain fields are not affiliate', tent && tent.changes.every((change) => change.affiliate === false));
assert('a moved item with no field change is not modified', !diff.modified.some((entry) => entry.item.id === 13));
assert('category rename reported', diff.categoriesRenamed.length === 1 && diff.categoriesRenamed[0].id === 6 && diff.categoriesRenamed[0].from === 'Cook' && diff.categoriesRenamed[0].to === 'Kitchen');
assert('list name change in meta', diff.meta.some((change) => change.field === 'name' && change.from === 'PCT' && change.to === 'PCT 2027'));
assert('seasons change in meta', diff.meta.some((change) => change.field === 'seasons' && change.to[0] === 'summer'));
assert('unchanged description not in meta', !diff.meta.some((change) => change.field === 'description'));
assert('totals before and after', diff.totals.baseWeightFrom === 3000 && diff.totals.baseWeightTo === 2500 && diff.totals.qtyFrom === 3 && diff.totals.qtyTo === 4);

console.log('\n--- hidden public fields ---');
const linkBase = payload({
    publicFields: { price: true, links: false, images: false },
    categories: [{ id: 5, name: 'Shelter', items: [item(11, { publicUrl: 'https://a.example', imageUrl: 'https://img.example/a.jpg' })] }],
});
const linkNext = payload({
    publicFields: { price: true, links: false, images: false },
    categories: [{ id: 5, name: 'Shelter', items: [item(11, { publicUrl: 'https://b.example', imageUrl: 'https://img.example/b.jpg' })] }],
});
assert('link and image changes hidden when not public', diffSnapshots(linkBase, linkNext).modified.length === 0);

const shownNext = payload({ publicFields: { price: true, links: true, images: true }, categories: linkNext.categories });
const shown = diffSnapshots(linkBase, shownNext);
const shownFields = shown.modified.length ? shown.modified[0].changes.map((change) => change.field) : [];
assert('link change shown when links are public', shownFields.includes('publicUrl'));
assert('image change shown when images are public', shownFields.includes('imageUrl'));

console.log('\n--- affiliate flags ---');
const affBase = payload({ categories: [{ id: 5, name: 'Shelter', items: [item(11, { publicUrl: 'https://a.example', promoCode: 'OLD' })] }] });
const affNext = payload({ categories: [{ id: 5, name: 'Shelter', items: [item(11, { publicUrl: 'https://aff.example', hasAffiliateLink: true, promoCode: 'NEW' })] }] });
const affChanges = diffSnapshots(affBase, affNext).modified[0].changes;
assert('promo code change is affiliate', affChanges.some((change) => change.field === 'promoCode' && change.affiliate === true));
assert('link change on an affiliate item is affiliate', affChanges.some((change) => change.field === 'publicUrl' && change.affiliate === true));

console.log('\n--- robustness ---');
const twice = payload({
    categories: [
        { id: 5, name: 'Shelter', items: [item(11)] },
        { id: 6, name: 'Cook', items: [item(11)] },
    ],
});
const twiceDiff = diffSnapshots(twice, JSON.parse(JSON.stringify(twice)));
assert('an item placed twice does not crash or report changes', twiceDiff.moved.length === 0 && twiceDiff.modified.length === 0);
console.log('\n--- an item placed in two categories ---');
const twoPlaces = (qtyShelter, qtyCook) => payload({
    categories: [
        { id: 5, name: 'Shelter', items: [item(11, { qty: qtyShelter })] },
        { id: 6, name: 'Cook', items: [item(11, { qty: qtyCook })] },
    ],
});
const secondQty = diffSnapshots(twoPlaces(1, 1), twoPlaces(1, 3));
const secondQtyChange = secondQty.modified.length === 1 && secondQty.modified[0].changes.find((change) => change.field === 'qty');
assert('a qty change on the second placement is reported', Boolean(secondQtyChange) && secondQtyChange.from === 1 && secondQtyChange.to === 3);
assert('that change names the category it happened in', Boolean(secondQtyChange) && secondQtyChange.category.name === 'Cook');
assert('it is not reported as added, removed or moved', secondQty.added.length + secondQty.removed.length + secondQty.moved.length === 0);

const dropped = diffSnapshots(twoPlaces(1, 1), payload({ categories: [{ id: 5, name: 'Shelter', items: [item(11)] }, { id: 6, name: 'Cook', items: [] }] }));
assert('dropping the second placement is a removal from that category, not a move', dropped.removed.length === 1 && dropped.removed[0].category.name === 'Cook' && dropped.moved.length === 0);

const gained = diffSnapshots(payload({ categories: [{ id: 5, name: 'Shelter', items: [item(11)] }, { id: 6, name: 'Cook', items: [] }] }), twoPlaces(1, 1));
assert('gaining a second placement is an addition to that category', gained.added.length === 1 && gained.added[0].category.name === 'Cook' && gained.removed.length === 0 && gained.moved.length === 0);

const singlePlace = diffSnapshots(base, next);
assert('single placements carry no category on their changes', singlePlace.modified.every((entry) => entry.changes.every((change) => !('category' in change))));

const empty = diffSnapshots({}, next);
assert('an empty base reports every item as added', empty.added.length === 3 && empty.removed.length === 0);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
