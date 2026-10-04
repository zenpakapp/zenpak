// Pure diff between two public payloads (buildPublicList output) of the same source list.
// Items and categories are matched by their author-side id, never by name; order is ignored.
// Inputs are already sanitized, so the diff can only show what the public page shows.
const ITEM_FIELDS = ['name', 'description', 'brand', 'shop', 'weight', 'price', 'qty', 'worn', 'consumable', 'star'];
const IMAGE_FIELDS = ['imageUrl', 'image'];
const LINK_FIELDS = ['publicUrl', 'promoCode', 'promoLabel'];
const AFFILIATE_FIELDS = ['promoCode', 'promoLabel'];
const META_FIELDS = ['name', 'description', 'seasons', 'listTypes'];

function sameValue(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
}

function summarizeItem(item) {
    return {
        id: item.id, name: item.name, brand: item.brand, weight: item.weight, qty: item.qty,
    };
}

// First placement wins when the author put the same item in two categories.
function indexItems(payload) {
    const byId = new Map();
    ((payload && payload.categories) || []).forEach((category) => {
        (category.items || []).forEach((item) => {
            const key = String(item.id);
            if (!byId.has(key)) byId.set(key, { item, category: { id: category.id, name: category.name } });
        });
    });
    return byId;
}

function comparedItemFields(publicFields) {
    const fields = ITEM_FIELDS.slice();
    if (publicFields && publicFields.images) fields.push(...IMAGE_FIELDS);
    if (publicFields && publicFields.links) fields.push(...LINK_FIELDS);
    return fields;
}

function diffItemFields(from, to, fields) {
    const affiliateLink = Boolean(from.hasAffiliateLink || to.hasAffiliateLink);
    return fields.reduce((changes, field) => {
        if (sameValue(from[field], to[field])) return changes;
        const affiliate = AFFILIATE_FIELDS.includes(field) || (field === 'publicUrl' && affiliateLink);
        changes.push({
            field, from: from[field], to: to[field], affiliate,
        });
        return changes;
    }, []);
}

function diffSnapshots(base, next) {
    const fields = comparedItemFields(next && next.publicFields);
    const before = indexItems(base);
    const after = indexItems(next);
    const added = [];
    const moved = [];
    const modified = [];

    after.forEach((entry, id) => {
        const previous = before.get(id);
        if (!previous) {
            added.push({ item: summarizeItem(entry.item), category: entry.category });
            return;
        }
        if (String(previous.category.id) !== String(entry.category.id)) {
            moved.push({ item: summarizeItem(entry.item), fromCategory: previous.category, toCategory: entry.category });
        }
        const changes = diffItemFields(previous.item, entry.item, fields);
        if (changes.length) modified.push({ item: summarizeItem(entry.item), changes });
    });

    const removed = [];
    before.forEach((entry, id) => {
        if (!after.has(id)) removed.push({ item: summarizeItem(entry.item), category: entry.category });
    });

    const baseCategories = new Map(((base && base.categories) || []).map((category) => [String(category.id), category]));
    const categoriesRenamed = ((next && next.categories) || []).reduce((renamed, category) => {
        const previous = baseCategories.get(String(category.id));
        if (previous && previous.name !== category.name) renamed.push({ id: category.id, from: previous.name, to: category.name });
        return renamed;
    }, []);

    const baseList = (base && base.list) || {};
    const nextList = (next && next.list) || {};
    const meta = META_FIELDS
        .filter((field) => !sameValue(baseList[field], nextList[field]))
        .map((field) => ({ field, from: baseList[field], to: nextList[field] }));

    return {
        added,
        removed,
        moved,
        modified,
        categoriesRenamed,
        meta,
        totals: {
            baseWeightFrom: Number(baseList.totalBaseWeight) || 0,
            baseWeightTo: Number(nextList.totalBaseWeight) || 0,
            qtyFrom: Number(baseList.totalQty) || 0,
            qtyTo: Number(nextList.totalQty) || 0,
        },
    };
}

module.exports = { diffSnapshots };
