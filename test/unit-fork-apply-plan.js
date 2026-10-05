'use strict';

const { Library } = require('../client/models/library.js');
const { planUpdate, isForkUntouched, findPayloadItem } = require('../client/utils/fork-apply-plan.js');

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

const base = payload([
    category(5, 'Shelter', [payloadItem(11, { name: 'Tent', weight: 900000, qty: 1 })]),
    category(6, 'Cook', [payloadItem(12, { name: 'Stove', weight: 100000 })]),
]);

console.log('\n--- isForkUntouched ---');
{
    const { library, list } = buildCopy(base);
    assert('a fresh copy is untouched', isForkUntouched(list, library, base) === true);
}
{
    const { library, list } = buildCopy(base);
    const tent = library.items.find((i) => i.name === 'Tent');
    tent.weight = 1;
    assert('a changed linked item field blocks', isForkUntouched(list, library, base) === false);
}
{
    const { library, list } = buildCopy(base);
    const cat = library.getCategoryById(list.categoryIds[0]);
    cat.getCategoryItemById(cat.categoryItems[0].itemId).qty = 3;
    assert('a changed linked placement field blocks', isForkUntouched(list, library, base) === false);
}
{
    const { library, list } = buildCopy(base);
    library.getCategoryById(list.categoryIds[0]).name = 'My shelter';
    assert('a renamed linked category blocks', isForkUntouched(list, library, base) === false);
}
{
    const { library, list } = buildCopy(base);
    const cat = library.getCategoryById(list.categoryIds[0]);
    cat.removeItem(cat.categoryItems[0].itemId);
    assert('removing a linked placement blocks', isForkUntouched(list, library, base) === false);
}
{
    const { library, list } = buildCopy(base);
    library.removeCategory(list.categoryIds[1], true);
    assert('removing a linked category blocks', isForkUntouched(list, library, base) === false);
}
{
    const { library, list } = buildCopy(base);
    list.description = 'mine';
    assert('a changed list description blocks', isForkUntouched(list, library, base) === false);
    list.description = base.list.description;
    list.name = 'Copy of Source';
    assert('the list name is ignored', isForkUntouched(list, library, base) === true);
}
{
    const { library, list } = buildCopy(base);
    const mine = library.newCategory({ list, _isNew: false });
    mine.name = 'Mine';
    const extra = library.newItem({ category: mine, _isNew: false });
    extra.name = 'My own pad';
    assert('unlinked categories and items never block', isForkUntouched(list, library, base) === true);
}
{
    const { library, list } = buildCopy(base);
    list.forkedFrom.itemLinks.push({ categoryId: 9999, itemId: 8888, sourceItemId: 11 });
    assert('a link to a missing local item blocks, never throws', isForkUntouched(list, library, base) === false);
}
{
    const { library, list } = buildCopy(base);
    list.forkedFrom.itemLinks.push({ categoryId: list.categoryIds[0], itemId: library.items[0].id, sourceItemId: 'nope' });
    assert('a link to a source item the base does not have is ignored', isForkUntouched(list, library, base) === true);
}
{
    const { library, list } = buildCopy(base);
    list.forkedFrom.promoCode = 'x';
    const tent = library.items.find((i) => i.name === 'Tent');
    tent.affiliateUrl = 'https://aff.example/x'; tent.promoCode = 'PROMO'; tent.promoLabel = 'Save'; tent.url = 'https://raw.example/tent';
    assert('affiliate fields and an unshared url never block', isForkUntouched(list, library, base) === true);
    assert('no list or no base is not untouched', isForkUntouched(null, library, base) === false && isForkUntouched(list, library, null) === false);
}
{
    const withLinks = payload(base.categories, { publicFields: { images: false, links: true, price: false } });
    withLinks.categories = [category(5, 'Shelter', [payloadItem(11, { name: 'Tent', weight: 900000, publicUrl: 'https://tent.example' })])];
    const { library, list } = buildCopy(withLinks);
    const tent = library.items.find((i) => i.name === 'Tent');
    tent.url = 'https://tent.example';
    assert('shared link equal to the copy url is untouched', isForkUntouched(list, library, withLinks) === true);
    tent.url = 'https://other.example';
    assert('a changed url blocks when the author shares links', isForkUntouched(list, library, withLinks) === false);
    const affiliate = payload([category(5, 'Shelter', [payloadItem(11, { name: 'Tent', weight: 900000, publicUrl: 'https://aff.example', hasAffiliateLink: true })])], { publicFields: { images: false, links: true, price: false } });
    const copy = buildCopy(affiliate);
    copy.library.items.find((i) => i.name === 'Tent').url = 'https://raw.example/tent';
    assert('an affiliate item url (raw vs affiliate) is not compared', isForkUntouched(copy.list, copy.library, affiliate) === true);
}
{
    const hiddenPrice = payload(base.categories);
    const { library, list } = buildCopy(hiddenPrice);
    library.items.find((i) => i.name === 'Tent').price = 55;
    assert('price is skipped while the author hides prices', isForkUntouched(list, library, hiddenPrice) === true);
    const shownPrice = payload(base.categories, { publicFields: { images: false, links: false, price: true } });
    assert('price counts once the author shows prices', isForkUntouched(list, library, shownPrice) === false);
}

console.log('\n--- planUpdate ---');
{
    const next = payload([
        category(5, 'Shelter', [payloadItem(11, {
            name: 'Tent', weight: 850000, promoCode: 'NEW', promoLabel: 'Deal', publicUrl: 'https://x.example', hasAffiliateLink: true,
        })]),
        category(7, 'Sleep', [payloadItem(13, { name: 'Pad' })]),
    ], { list: { name: 'Renamed', description: 'new', seasons: ['summer'], listTypes: ['hiking'], totalBaseWeight: 0, totalQty: 0 } });
    next.publicFields = { images: false, links: true, price: false };
    const plan = planUpdate(base, next);
    const tent = plan.modified.find((entry) => entry.item.id === 11);
    const fields = tent ? tent.changes.map((c) => c.field) : [];
    assert('keeps the weight change with its local field', fields.includes('weight') && tent.changes.find((c) => c.field === 'weight').localField === 'weight');
    assert('drops promoCode and promoLabel', !fields.includes('promoCode') && !fields.includes('promoLabel'));
    assert('drops the link change of an affiliate item', !fields.includes('publicUrl'));
    assert('list name change is dropped, description kept', plan.meta.length === 1 && plan.meta[0].field === 'description');
    assert('an added category is reported', plan.addedCategories.length === 1 && plan.addedCategories[0].id === 7 && plan.addedCategories[0].name === 'Sleep');
    assert('a removed category is reported', plan.removedCategories.length === 1 && plan.removedCategories[0].id === 6);
    assert('the Pad is an added item', plan.added.some((entry) => entry.item.id === 13));
    assert('the Stove is removed', plan.removed.some((entry) => entry.item.id === 12));
}
{
    const linkBase = payload([category(5, 'Shelter', [payloadItem(11, { publicUrl: 'https://a.example' })])]);
    linkBase.publicFields.links = true;
    const linkNext = payload([category(5, 'Shelter', [payloadItem(11, { publicUrl: 'https://b.example' })])]);
    linkNext.publicFields.links = true;
    const plan = planUpdate(linkBase, linkNext);
    const change = plan.modified[0] && plan.modified[0].changes.find((c) => c.field === 'publicUrl');
    assert('a shared link change maps to local url', Boolean(change) && change.localField === 'url');
    const hidden = planUpdate(payload(linkBase.categories), payload(linkNext.categories));
    assert('link changes are dropped when links are not shared', hidden.modified.length === 0);
}

console.log('\n--- findPayloadItem ---');
{
    assert('finds an item by category and id, ids as strings or numbers', findPayloadItem(base, '5', 11).name === 'Tent');
    assert('null when the pair does not exist', findPayloadItem(base, 5, 12) === null && findPayloadItem(null, 5, 11) === null);
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
