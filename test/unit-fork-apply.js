'use strict';

const { Library } = require('../client/models/library.js');
const { applyUpdate, undoUpdate } = require('../client/utils/fork-apply.js');
const { isForkUntouched } = require('../client/utils/fork-apply-plan.js');

let passed = 0; let failed = 0;
function assert(desc, cond) {
    if (cond) { console.log(`  PASS  ${desc}`); passed++; }
    else { console.error(`  FAIL  ${desc}`); failed++; }
}

function payloadItem(id, overrides = {}) {
    return {
        id, name: `Item ${id}`, description: '', brand: '', shop: '', weight: 1000, price: 0, image: '', imageUrl: '',
        publicUrl: '', promoCode: '', promoLabel: '', hasAffiliateLink: false, qty: 1, worn: 0, consumable: false, star: 0, ...overrides,
    };
}
function payload(categories, overrides = {}) {
    return {
        publicFields: { images: false, links: false, price: false },
        categories,
        list: { name: 'Source', description: 'd', seasons: ['summer'], listTypes: ['hiking'], totalBaseWeight: 0, totalQty: 0 },
        ...overrides,
    };
}
const category = (id, name, items) => ({ id, name, items });

// Build a copy of `base` the way importPublicList does: links are (local id -> source id) pairs.
function buildCopy(base) {
    const library = new Library();
    const list = library.lists[0];
    list.categoryIds = [];
    list.description = base.list.description;
    list.seasons = base.list.seasons.slice();
    list.listTypes = base.list.listTypes.slice();
    const itemLinks = []; const categoryLinks = [];
    base.categories.forEach((sourceCategory) => {
        const local = library.newCategory({ list, _isNew: false });
        local.name = sourceCategory.name;
        categoryLinks.push({ categoryId: local.id, sourceCategoryId: sourceCategory.id });
        sourceCategory.items.forEach((entry) => {
            const item = library.newItem({ category: local, _isNew: false });
            Object.assign(item, {
                name: entry.name, description: entry.description, brand: entry.brand, shop: entry.shop, weight: entry.weight, price: entry.price,
            });
            const placement = local.getCategoryItemById(item.id);
            Object.assign(placement, { qty: entry.qty, worn: entry.worn, consumable: entry.consumable, star: entry.star });
            itemLinks.push({ categoryId: local.id, itemId: item.id, sourceItemId: entry.id });
        });
    });
    list.forkedFrom = { externalId: 'abc', version: 1, ownerId: 'o1', itemLinks, categoryLinks };
    return { library, list };
}

const categoryByName = (library, list, name) => list.categoryIds.map((id) => library.getCategoryById(id)).find((c) => c && c.name === name);
const itemNames = (library, cat) => cat.categoryItems.map((ci) => library.getItemById(ci.itemId).name);

const base = payload([
    category(5, 'Shelter', [payloadItem(11, { name: 'Tent', weight: 900000 })]),
    category(6, 'Cook', [payloadItem(12, { name: 'Stove', weight: 100000 })]),
]);
const next = payload([
    category(5, 'Shelter', [payloadItem(11, { name: 'Tent', weight: 850000, qty: 2 }), payloadItem(13, { name: 'Pad', weight: 400000, brand: 'Thermarest' })]),
    category(8, 'Sleep', [payloadItem(14, { name: 'Quilt', weight: 600000 })]),
], { list: { name: 'Source v2', description: 'd2', seasons: ['summer', 'fall'], listTypes: ['hiking'], totalBaseWeight: 0, totalQty: 0 } });

console.log('\n--- applyUpdate ---');
const copy = buildCopy(base);
const { library, list } = copy;
const mine = library.newCategory({ list, _isNew: false }); mine.name = 'Mine';
const mineItem = library.newItem({ category: mine, _isNew: false }); mineItem.name = 'My pad';
// sequence is deliberately not rewound by undo (ids must never be reused), so it is left out.
const libraryView = () => {
    const saved = library.save();
    const byId = (a, b) => String(a.id).localeCompare(String(b.id));
    return JSON.stringify({
        list: list.save(), items: saved.items.slice().sort(byId), categories: saved.categories.slice().sort(byId),
    });
};
list.calculateTotals(); // the fixture never computed totals; undo recomputes them
const before = libraryView();
applyUpdate(library, list, base, next, 2);
const shelter = categoryByName(library, list, 'Shelter');
const sleep = categoryByName(library, list, 'Sleep');
const tent = library.items.find((i) => i.name === 'Tent');
assert('the version is bumped', list.forkedFrom.version === 2);
assert('modified weight is applied', tent.weight === 850000);
assert('modified placement qty is applied', shelter.getCategoryItemById(tent.id).qty === 2);
assert('an added item is created in its linked category', itemNames(library, shelter).includes('Pad'));
assert('the new item carries the shared fields, no affiliate', (() => { const pad = library.items.find((i) => i.name === 'Pad'); return pad.brand === 'Thermarest' && pad.weight === 400000 && pad.affiliateUrl === '' && pad.promoCode === ''; })());
assert('an added category is created and gets its item', Boolean(sleep) && itemNames(library, sleep).join() === 'Quilt');
assert('the removed category is gone', !categoryByName(library, list, 'Cook'));
assert('the user\'s own category and item survive', Boolean(categoryByName(library, list, 'Mine')) && itemNames(library, mine).join() === 'My pad');
assert('list meta is applied, name is not', list.description === 'd2' && list.seasons.join() === 'summer,fall' && list.name !== 'Source v2');
assert('links now include the new item and category', list.forkedFrom.itemLinks.some((l) => String(l.sourceItemId) === '13') && list.forkedFrom.categoryLinks.some((l) => String(l.sourceCategoryId) === '8'));
assert('links no longer reference the removed items and category', !list.forkedFrom.itemLinks.some((l) => String(l.sourceItemId) === '12') && !list.forkedFrom.categoryLinks.some((l) => String(l.sourceCategoryId) === '6'));
assert('the copy is now untouched against the latest', isForkUntouched(list, library, next) === true);
const undo = list.forkedFrom.undo;
assert('an undo snapshot is stored', Boolean(undo) && undo.fromVersion === 1 && undo.createdItemIds.length === 2 && Array.isArray(undo.items) && Array.isArray(undo.categories));

console.log('\n--- undoUpdate ---');
assert('undo returns true', undoUpdate(library, list) === true);
assert('version is back', list.forkedFrom.version === 1);
assert('the snapshot is cleared', list.forkedFrom.undo === undefined);
assert('the whole library is back to what it was before the update', libraryView() === before);
assert('the removed category is back with its original id and links', Boolean(categoryByName(library, list, 'Cook')) && list.forkedFrom.categoryLinks.some((l) => String(l.sourceCategoryId) === '6'));
assert('the copy is untouched against the base again', isForkUntouched(list, library, base) === true);
assert('a second undo is a no-op', undoUpdate(library, list) === false);

console.log('\n--- moves, removals, existing links, untrusted links ---');
{
    const b = payload([category(5, 'A', [payloadItem(11, { name: 'Stove' })]), category(6, 'B', [payloadItem(12, { name: 'Pot' })])]);
    const n = payload([category(5, 'A', [payloadItem(12, { name: 'Pot' })]), category(6, 'B', [payloadItem(11, { name: 'Stove' })])]);
    const c = buildCopy(b);
    applyUpdate(c.library, c.list, b, n, 2);
    const catA = categoryByName(c.library, c.list, 'A'); const catB = categoryByName(c.library, c.list, 'B');
    assert('items are swapped between categories', itemNames(c.library, catA).join() === 'Pot' && itemNames(c.library, catB).join() === 'Stove');
    assert('moved links follow their category', isForkUntouched(c.list, c.library, n) === true);
    assert('undo restores the swap', undoUpdate(c.library, c.list) && itemNames(c.library, categoryByName(c.library, c.list, 'A')).join() === 'Stove');
}
{
    const b = payload([category(5, 'A', [payloadItem(11, { name: 'Tent' }), payloadItem(12, { name: 'Pad' })])]);
    const n = payload([category(5, 'A', [payloadItem(11, { name: 'Tent' })])]);
    const c = buildCopy(b);
    applyUpdate(c.library, c.list, b, n, 2);
    assert('a removed placement leaves the item in the library', itemNames(c.library, categoryByName(c.library, c.list, 'A')).join() === 'Tent' && c.library.items.some((i) => i.name === 'Pad'));
}
{
    const b = payload([category(5, 'A', [payloadItem(11, { name: 'Tent' })])]);
    const n = payload([category(5, 'A', [payloadItem(11, { name: 'Tent' })]), category(6, 'B', [payloadItem(11, { name: 'Tent' })])]);
    const c = buildCopy(b);
    applyUpdate(c.library, c.list, b, n, 2);
    const catB = categoryByName(c.library, c.list, 'B');
    assert('an item newly placed in a second category reuses the linked local item', c.library.items.filter((i) => i.name === 'Tent').length === 1 && itemNames(c.library, catB).join() === 'Tent');
}
{
    const b = payload([category(5, 'A', [payloadItem(11, { name: 'Tent' })])]);
    const n = payload([category(5, 'A', [payloadItem(11, { name: 'Tent', weight: 5 })])]);
    const c = buildCopy(b);
    c.list.forkedFrom.itemLinks.push({ categoryId: 9999, itemId: 8888, sourceItemId: 11 });
    c.list.forkedFrom.categoryLinks.push({ categoryId: 7777, sourceCategoryId: 5 });
    let threw = false;
    try { applyUpdate(c.library, c.list, b, n, 2); } catch (err) { threw = true; }
    assert('dangling links never throw', threw === false);
    assert('the valid part is still applied', c.library.items.find((i) => i.name === 'Tent').weight === 5);
}
{
    const b = payload([category(5, 'A', [payloadItem(11, { name: 'Tent', description: 'x', brand: 'Z', weight: 100 })])]);
    const n = payload([category(5, 'A', [payloadItem(11, { name: 'Tent', description: 'x', brand: 'Z', weight: 100 }), payloadItem(21, { name: 'Tent', description: 'x', brand: 'Z', weight: 100 })])]);
    const c = buildCopy(b);
    const extra = c.library.newItem({ category: c.library.getCategoryById(c.list.categoryIds[0]), _isNew: false });
    Object.assign(extra, { name: 'Tent', description: 'x', brand: 'Z', weight: 100 });
    const countBefore = c.library.items.length;
    applyUpdate(c.library, c.list, b, n, 2);
    assert('an added item merges into an identical library item by signature', c.library.items.length === countBefore);
    assert('merged items are not deleted by undo', undoUpdate(c.library, c.list) && c.library.items.length === countBefore);
}
{
    const b = payload([category(5, 'A', [payloadItem(11, { name: 'Tent' })]), category(6, 'B', [])]);
    const n = payload([category(5, 'A', [payloadItem(11, { name: 'Tent' })])]);
    const c = buildCopy(b);
    const bCat = categoryByName(c.library, c.list, 'B');
    const own = c.library.newItem({ category: bCat, _isNew: false }); own.name = 'Mine';
    applyUpdate(c.library, c.list, b, n, 2);
    assert('a removed source category that holds the user\'s own items is kept, unlinked', Boolean(categoryByName(c.library, c.list, 'B')) && !c.list.forkedFrom.categoryLinks.some((l) => String(l.sourceCategoryId) === '6'));
}
{
    const b = payload([category(5, 'A', [payloadItem(11, { name: 'Tent' })])]);
    const c = buildCopy(b);
    c.list.forkedFrom.dismissedVersion = 2;
    const n = payload([category(5, 'A', [payloadItem(11, { name: 'Tent', weight: 5 })])]);
    applyUpdate(c.library, c.list, b, n, 2);
    undoUpdate(c.library, c.list);
    assert('undo restores dismissedVersion', c.list.forkedFrom.dismissedVersion === 2);
}
{
    const b = payload([category(5, 'A', [payloadItem(11, { name: 'Tent' })])]);
    const n = payload([category(5, 'A', [payloadItem(11, { name: 'Tent', weight: 5 })])]);
    const c = buildCopy(b);
    applyUpdate(c.library, c.list, b, n, 2);
    const roundTrip = new Library();
    roundTrip.load(JSON.parse(JSON.stringify(c.library.save())));
    const reloaded = roundTrip.getListById(c.list.id);
    assert('the undo snapshot survives a save and load', Boolean(reloaded.forkedFrom.undo) && reloaded.forkedFrom.undo.fromVersion === 1);
    assert('and still undoes after a reload', undoUpdate(roundTrip, reloaded) === true && roundTrip.items.find((i) => i.name === 'Tent').weight === 1000);
}

{
    // The source drops its only category: the copy must keep one category (a list never has zero).
    const b = payload([category(5, 'A', [payloadItem(11, { name: 'Tent' })])]);
    const n = payload([category(8, 'New', [payloadItem(14, { name: 'Quilt' })])]);
    const c = buildCopy(b);
    applyUpdate(c.library, c.list, b, n, 2);
    assert('the list still has categories after the source replaced them all', c.list.categoryIds.length >= 1);
    const only = payload([category(5, 'A', [payloadItem(11, { name: 'Tent' })])]);
    const empty = payload([]);
    const d = buildCopy(only);
    applyUpdate(d.library, d.list, only, empty, 2);
    assert('a source with no categories never leaves the copy with zero (the emptied last category stays, unlinked)', d.list.categoryIds.length === 1 && !d.list.forkedFrom.categoryLinks.some((l) => String(l.sourceCategoryId) === '5'));
}
{
    // Fix 1: undo drops placements whose item the user deleted after the update.
    const b = payload([category(5, 'A', [payloadItem(11, { name: 'Tent' })])]);
    const n = payload([category(5, 'A', [payloadItem(11, { name: 'Tent', weight: 5 })])]);
    const c = buildCopy(b);
    const catA = c.library.getCategoryById(c.list.categoryIds[0]);
    const own = c.library.newItem({ category: catA, _isNew: false }); own.name = 'Mine';
    applyUpdate(c.library, c.list, b, n, 2);
    c.library.removeItem(own.id);
    undoUpdate(c.library, c.list);
    const restored = c.library.getCategoryById(c.list.categoryIds[0]);
    assert('undo leaves no placement pointing at a deleted item', restored.categoryItems.every((ci) => Boolean(c.library.getItemById(ci.itemId))));
}
{
    // Fix 2: totals of the user's other lists follow shared items.
    const b = payload([category(5, 'A', [payloadItem(11, { name: 'Tent', weight: 100 })])]);
    const n = payload([category(5, 'A', [payloadItem(11, { name: 'Tent', weight: 500 })])]);
    const c = buildCopy(b);
    const tent = c.library.items.find((i) => i.name === 'Tent');
    const other = c.library.newList();
    const otherCat = c.library.newCategory({ list: other, _isNew: false });
    otherCat.addItem({ itemId: tent.id, _isNew: false });
    other.calculateTotals(); c.list.calculateTotals();
    const w = other.totalWeight;
    applyUpdate(c.library, c.list, b, n, 2);
    assert('another list sharing the item gets fresh totals after apply', other.totalWeight === 500 && w !== 500);
    undoUpdate(c.library, c.list);
    assert('and after undo', other.totalWeight === w);
}
{
    // Fix 3a: an item link whose category belongs to another list means modified.
    const b = payload([category(5, 'A', [payloadItem(11, { name: 'Tent' })])]);
    const c = buildCopy(b);
    const tent = c.library.items.find((i) => i.name === 'Tent');
    const other = c.library.newList();
    const otherCat = c.library.newCategory({ list: other, _isNew: false });
    otherCat.addItem({ itemId: tent.id, _isNew: false });
    c.list.forkedFrom.itemLinks[0].categoryId = otherCat.id;
    assert('an item link into another list\'s category blocks the untouched check', isForkUntouched(c.list, c.library, b) === false);
}
{
    // Fix 3b: a category link pointing at another list's empty category is not deleted.
    const b = payload([category(5, 'A', [payloadItem(11, { name: 'Tent' })]), category(6, 'B', [])]);
    const n = payload([category(5, 'A', [payloadItem(11, { name: 'Tent' })])]);
    const c = buildCopy(b);
    const other = c.library.newList();
    const foreign = c.library.newCategory({ list: other, _isNew: false });
    c.list.forkedFrom.categoryLinks.find((l) => String(l.sourceCategoryId) === '6').categoryId = foreign.id;
    applyUpdate(c.library, c.list, b, n, 2);
    assert('a foreign category is never removed by apply', Boolean(c.library.getCategoryById(foreign.id)) && other.categoryIds.includes(foreign.id));
}
{
    // Fix 3c: an item link whose itemId is a category id never throws and the snapshot serialises.
    const b = payload([category(5, 'A', [payloadItem(11, { name: 'Tent' })])]);
    const n = payload([category(5, 'A', [payloadItem(11, { name: 'Tent', weight: 5 })])]);
    const c = buildCopy(b);
    c.list.forkedFrom.itemLinks.push({ categoryId: c.list.categoryIds[0], itemId: c.list.categoryIds[0], sourceItemId: 11 });
    let threw = false;
    try { applyUpdate(c.library, c.list, b, n, 2); } catch (err) { threw = true; }
    let serialisable = true;
    try { JSON.stringify(c.list.forkedFrom.undo); } catch (err) { serialisable = false; }
    assert('an item link pointing at a category id does not throw', threw === false);
    assert('and the undo snapshot is JSON-serialisable', serialisable);
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
