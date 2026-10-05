// CommonJS so test/unit-*.js can require it. Pure: no store, no DOM, no network.
// Shared by the "is this copy untouched?" check and the apply step, so both agree on which
// fields count (see "Field mapping" in the phase 2 spec).
const { diffSnapshots } = require('../../server/list-diff.js');

const ITEM_FIELDS = ['name', 'description', 'brand', 'shop', 'weight', 'price', 'publicUrl', 'imageUrl', 'image'];
const PLACEMENT_FIELDS = ['qty', 'worn', 'consumable', 'star'];
const ALWAYS_FIELDS = new Set(['name', 'description', 'brand', 'shop', 'weight', ...PLACEMENT_FIELDS]);
const NUMERIC_FIELDS = new Set(['weight', 'price', 'qty', 'worn', 'star']);
const META_FIELDS = ['description', 'seasons', 'listTypes'];

function sameId(a, b) {
    return String(a) === String(b);
}

// Payload field -> local field, or null when it is out of scope (affiliate, hidden, not shared).
function localFieldFor(field, publicFields, hasAffiliateLink) {
    if (ALWAYS_FIELDS.has(field)) return field;
    const shown = publicFields || {};
    if (field === 'price') return shown.price ? 'price' : null;
    // The copy keeps the author's raw url while the payload shows affiliateUrl || url: not comparable.
    if (field === 'publicUrl') return shown.links && !hasAffiliateLink ? 'url' : null;
    if (field === 'imageUrl' || field === 'image') return shown.images ? field : null;
    return null;
}

function sameFieldValue(field, local, remote) {
    if (NUMERIC_FIELDS.has(field)) return Number(local || 0) === Number(remote || 0);
    if (field === 'consumable') return Boolean(local) === Boolean(remote);
    return String(local || '') === String(remote || '');
}

function findPayloadItem(payload, sourceCategoryId, sourceItemId) {
    const sourceCategory = ((payload && payload.categories) || []).find((entry) => sameId(entry.id, sourceCategoryId));
    if (!sourceCategory) return null;
    return (sourceCategory.items || []).find((item) => sameId(item.id, sourceItemId)) || null;
}

function itemsById(payload) {
    const byId = new Map();
    ((payload && payload.categories) || []).forEach((entry) => {
        (entry.items || []).forEach((item) => {
            if (!byId.has(String(item.id))) byId.set(String(item.id), item);
        });
    });
    return byId;
}

// diffSnapshots is a display diff: it reports affiliate promo fields and the list name. The apply
// plan keeps only what may be applied, with the local field each change writes to.
function planUpdate(basePayload, latestPayload) {
    const raw = diffSnapshots(basePayload, latestPayload);
    const publicFields = (latestPayload && latestPayload.publicFields) || {};
    const baseItems = itemsById(basePayload);
    const latestItems = itemsById(latestPayload);
    const hasAffiliate = (id) => Boolean(
        (baseItems.get(String(id)) || {}).hasAffiliateLink || (latestItems.get(String(id)) || {}).hasAffiliateLink,
    );

    const modified = raw.modified.map((entry) => ({
        item: entry.item,
        changes: entry.changes.reduce((kept, change) => {
            const localField = localFieldFor(change.field, publicFields, hasAffiliate(entry.item.id));
            if (localField) kept.push({ ...change, localField });
            return kept;
        }, []),
    })).filter((entry) => entry.changes.length);

    const baseCategories = (basePayload && basePayload.categories) || [];
    const latestCategories = (latestPayload && latestPayload.categories) || [];
    const summary = (entry) => ({ id: entry.id, name: entry.name });
    return {
        ...raw,
        modified,
        meta: raw.meta.filter((change) => META_FIELDS.includes(change.field)),
        addedCategories: latestCategories.filter((entry) => !baseCategories.some((b) => sameId(b.id, entry.id))).map(summary),
        removedCategories: baseCategories.filter((entry) => !latestCategories.some((l) => sameId(l.id, entry.id))).map(summary),
    };
}

// True when every linked field of the copy still equals the base version it was copied from.
// Items and categories the user added themselves are not linked, so they never count.
// Links are untrusted hints: one that points at nothing locally means "modified", one the base
// does not know is ignored.
function isForkUntouched(list, library, basePayload) {
    const forked = list && list.forkedFrom;
    if (!forked || !basePayload || !library) return false;
    const categoryLinks = Array.isArray(forked.categoryLinks) ? forked.categoryLinks : [];
    const itemLinks = Array.isArray(forked.itemLinks) ? forked.itemLinks : [];
    const publicFields = basePayload.publicFields || {};
    const listCategoryIds = (list.categoryIds || []).map(String);

    const baseList = basePayload.list || {};
    const metaChanged = META_FIELDS.some((field) => JSON.stringify(list[field] === undefined ? '' : list[field])
        !== JSON.stringify(baseList[field] === undefined ? '' : baseList[field]));
    if (metaChanged) return false;

    const categoriesOk = categoryLinks.every((link) => {
        const local = library.getCategoryById(link.categoryId);
        if (!local || !listCategoryIds.includes(String(link.categoryId))) return false;
        const source = (basePayload.categories || []).find((entry) => sameId(entry.id, link.sourceCategoryId));
        if (!source) return true;
        return (local.name || '') === (source.name || '');
    });
    if (!categoriesOk) return false;

    return itemLinks.every((link) => {
        const localCategory = library.getCategoryById(link.categoryId);
        const localItem = library.getItemById(link.itemId);
        const placement = localCategory && localCategory.getCategoryItemById(link.itemId);
        if (!localCategory || !localItem || !placement || !listCategoryIds.includes(String(link.categoryId))) return false;
        const categoryLink = categoryLinks.find((entry) => sameId(entry.categoryId, link.categoryId));
        const sourceItem = categoryLink ? findPayloadItem(basePayload, categoryLink.sourceCategoryId, link.sourceItemId) : null;
        if (!sourceItem) return true;
        const itemOk = ITEM_FIELDS.every((field) => {
            const localField = localFieldFor(field, publicFields, sourceItem.hasAffiliateLink);
            return !localField || sameFieldValue(localField, localItem[localField], sourceItem[field]);
        });
        return itemOk && PLACEMENT_FIELDS.every((field) => sameFieldValue(field, placement[field], sourceItem[field]));
    });
}

module.exports = {
    planUpdate, isForkUntouched, findPayloadItem, localFieldFor, PLACEMENT_FIELDS,
};
