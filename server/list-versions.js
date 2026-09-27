const crypto = require('crypto');

const { Library } = require('../client/models/library.js');

const LEGACY_HIDDEN_FIELD = 'creator' + 'LinksRemoved';
const PUBLISHED_LIST_FIELDS = [
    'id', 'externalId', 'name', 'description', 'summary', 'seasons', 'listTypes',
    'visibility', 'allowSearchIndexing', 'copyable', 'categoryIds', 'forkedFrom',
    'publicFields', 'sourceListInfoHidden', LEGACY_HIDDEN_FIELD,
];
const SHARE_SETTING_FIELDS = ['visibility', 'allowSearchIndexing', 'copyable'];
const NOTE_MAX_LENGTH = 200;

function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

function stableStringify(value) {
    if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
    if (value && typeof value === 'object') {
        return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
    }
    return JSON.stringify(value);
}

function pickFields(source, fields) {
    const out = {};
    fields.forEach((field) => {
        if (typeof source[field] !== 'undefined') out[field] = source[field];
    });
    return out;
}

// One list, its categories, the items they place, and the settings needed to render it,
// in the shape Library.load() accepts. Never spreads the live list: see PUBLISHED_LIST_FIELDS.
function buildFrozenLibrary(rawLibrary, externalId) {
    const lists = (rawLibrary && rawLibrary.lists) || [];
    const list = lists.find((entry) => entry.externalId && entry.externalId === externalId);
    if (!list) return null;

    const categoryIds = (list.categoryIds || []).map(String);
    const categories = (rawLibrary.categories || []).filter((category) => categoryIds.includes(String(category.id)));
    const itemIds = new Set();
    categories.forEach((category) => {
        (category.categoryItems || []).forEach((categoryItem) => itemIds.add(String(categoryItem.itemId)));
    });
    const items = (rawLibrary.items || []).filter((item) => itemIds.has(String(item.id)));
    const profile = rawLibrary.publicProfile || {};
    const entitlements = rawLibrary.entitlements || {};

    return clone({
        version: rawLibrary.version,
        sequence: rawLibrary.sequence,
        totalUnit: rawLibrary.totalUnit,
        itemUnit: rawLibrary.itemUnit,
        currencySymbol: rawLibrary.currencySymbol,
        optionalFields: rawLibrary.optionalFields,
        defaultListId: list.id,
        publicProfile: { displayName: profile.displayName || '' },
        entitlements: { plan: entitlements.plan || 'free' },
        creator: rawLibrary.creator || {},
        items,
        categories,
        lists: [pickFields(list, PUBLISHED_LIST_FIELDS)],
    });
}

// Share settings are overlaid live at read time, so they are not part of the content hash.
function hashFrozenLibrary(frozen) {
    const forHash = clone(frozen);
    forHash.lists.forEach((list) => {
        SHARE_SETTING_FIELDS.forEach((field) => { delete list[field]; });
    });
    return crypto.createHash('sha256').update(stableStringify(forHash)).digest('hex');
}

function computeTotals(frozen) {
    const library = new Library();
    library.load(clone(frozen));
    const list = library.lists[0];
    return {
        baseWeight: Number(list.totalBaseWeight) || 0,
        totalWeight: Number(list.totalWeight) || 0,
        qty: Number(list.totalQty) || 0,
    };
}

function normalizeNote(value) {
    return typeof value === 'string' ? value.trim().slice(0, NOTE_MAX_LENGTH) : '';
}

module.exports = {
    buildFrozenLibrary,
    hashFrozenLibrary,
    computeTotals,
    normalizeNote,
};
