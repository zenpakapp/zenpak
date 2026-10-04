// Pure diff between two public payloads (buildPublicList output) of the same source list.
// Items and categories are matched by their author-side id, never by name; order is ignored.
// Inputs are already sanitized, so the diff can only show what the public page shows.
// Item-level fields (name, weight, ...) are compared once per item; placement-level fields
// (qty, worn, ...) once per category the item sits in, so an item placed in two categories
// is compared in both.
const ITEM_FIELDS = ['name', 'description', 'brand', 'shop', 'weight', 'price'];
const PLACEMENT_FIELDS = ['qty', 'worn', 'consumable', 'star'];
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

// item id -> every placement of that item, in category order.
function indexItems(payload) {
    const byId = new Map();
    ((payload && payload.categories) || []).forEach((category) => {
        (category.items || []).forEach((item) => {
            const key = String(item.id);
            if (!byId.has(key)) byId.set(key, []);
            byId.get(key).push({ item, category: { id: category.id, name: category.name } });
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

function diffFields(from, to, fields, category) {
    const affiliateLink = Boolean(from.hasAffiliateLink || to.hasAffiliateLink);
    return fields.reduce((changes, field) => {
        if (sameValue(from[field], to[field])) return changes;
        const affiliate = AFFILIATE_FIELDS.includes(field) || (field === 'publicUrl' && affiliateLink);
        const change = {
            field, from: from[field], to: to[field], affiliate,
        };
        if (category) change.category = category;
        changes.push(change);
        return changes;
    }, []);
}

// Same category -> same placement. Leftovers on both sides pair up as moves; any extra
// next placement is an addition to that category, any extra base one a removal from it.
function pairPlacements(before, after) {
    const unmatchedBefore = before.slice();
    const unmatchedAfter = [];
    const pairs = [];
    after.forEach((placement) => {
        const index = unmatchedBefore.findIndex((entry) => String(entry.category.id) === String(placement.category.id));
        if (index >= 0) pairs.push([unmatchedBefore.splice(index, 1)[0], placement]);
        else unmatchedAfter.push(placement);
    });
    const moves = [];
    while (unmatchedBefore.length && unmatchedAfter.length) {
        const from = unmatchedBefore.shift();
        const to = unmatchedAfter.shift();
        moves.push([from, to]);
        pairs.push([from, to]);
    }
    return {
        pairs, moves, added: unmatchedAfter, removed: unmatchedBefore,
    };
}

function diffSnapshots(base, next) {
    const itemFields = comparedItemFields(next && next.publicFields);
    const before = indexItems(base);
    const after = indexItems(next);
    const added = [];
    const removed = [];
    const moved = [];
    const modified = [];

    after.forEach((placements, id) => {
        const previous = before.get(id);
        if (!previous) {
            placements.forEach((placement) => added.push({ item: summarizeItem(placement.item), category: placement.category }));
            return;
        }
        const paired = pairPlacements(previous, placements);
        paired.moves.forEach(([from, to]) => {
            moved.push({ item: summarizeItem(to.item), fromCategory: from.category, toCategory: to.category });
        });
        paired.added.forEach((placement) => added.push({ item: summarizeItem(placement.item), category: placement.category }));
        paired.removed.forEach((placement) => removed.push({ item: summarizeItem(placement.item), category: placement.category }));

        const several = previous.length > 1 || placements.length > 1;
        const changes = diffFields(previous[0].item, placements[0].item, itemFields);
        paired.pairs.forEach(([from, to]) => {
            changes.push(...diffFields(from.item, to.item, PLACEMENT_FIELDS, several ? to.category : null));
        });
        if (changes.length) modified.push({ item: summarizeItem(placements[0].item), changes });
    });

    before.forEach((placements, id) => {
        if (after.has(id)) return;
        placements.forEach((placement) => removed.push({ item: summarizeItem(placement.item), category: placement.category }));
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
