const crypto = require('crypto');
const { ObjectId } = require('mongodb');

const db = require('./db.js');
const { isPublicVisibility } = require('../client/services/public-visibility.js');
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

function findLiveList(user, externalId) {
    const lists = (user && user.library && user.library.lists) || [];
    return lists.find((list) => list.externalId && list.externalId === externalId) || null;
}

async function getLatest(externalId) {
    if (!externalId || !db.listVersions) return null;
    const rows = await db.listVersions.findSorted({ externalId }, { version: -1 }, 1);
    return rows[0] || null;
}

async function getLatestOwnedVersion(user, externalId) {
    const latest = await getLatest(externalId);
    if (!latest || String(latest.ownerId) !== String(user._id)) return null;
    return latest;
}

async function publishVersion(user, externalId, note) {
    const liveList = findLiveList(user, externalId);
    if (!liveList) return { error: 'not-found' };
    if (!isPublicVisibility(liveList.visibility)) return { error: 'private' };

    const frozen = buildFrozenLibrary(user.library, externalId);
    const contentHash = hashFrozenLibrary(frozen);
    const ownerId = new ObjectId(user._id);

    // The unique {externalId, version} index prevents duplicate versions. On a race,
    // MongoDB rejects with a duplicate key error; we catch that and retry with the next version.
    for (let attempt = 0; attempt < 2; attempt++) {
        const latest = await getLatest(externalId);
        if (latest && String(latest.ownerId) !== String(ownerId)) return { error: 'conflict' };
        if (latest && latest.contentHash === contentHash) {
            return { version: latest.version, created: false, publishedAt: latest.publishedAt };
        }

        const version = (latest ? latest.version : 0) + 1;
        const publishedAt = new Date();
        try {
            const result = await db.listVersions.updateOne(
                { externalId, version },
                {
                    $setOnInsert: {
                        ownerId, publishedAt, note: normalizeNote(note), contentHash, library: frozen, totals: computeTotals(frozen),
                    },
                },
                { upsert: true },
            );
            if (result.upsertedCount === 1) return { version, created: true, publishedAt };
        } catch (err) {
            if (err.code !== 11000) throw err;
            // lost the race on this version number — loop and retry with the next one
        }
    }
    return { error: 'conflict' };
}

async function getPublishStatus(user, externalId) {
    if (!findLiveList(user, externalId)) return null;
    const latest = await getLatestOwnedVersion(user, externalId);
    if (!latest) return { latestVersion: 0, publishedAt: null, hasUnpublishedChanges: false };
    const frozen = buildFrozenLibrary(user.library, externalId);
    return {
        latestVersion: latest.version,
        publishedAt: latest.publishedAt,
        hasUnpublishedChanges: hashFrozenLibrary(frozen) !== latest.contentHash,
    };
}

// Live identity + frozen content + live share settings. Null unless the list is currently
// shared AND has a snapshot owned by this user. Public readers use this instead of the live library.
async function getServedUser(user, externalId) {
    const liveList = findLiveList(user, externalId);
    if (!liveList || !isPublicVisibility(liveList.visibility)) return null;

    const version = await getLatestOwnedVersion(user, externalId);
    if (!version) return null;

    const library = clone(version.library);
    const publishedList = library.lists[0];
    SHARE_SETTING_FIELDS.forEach((field) => {
        if (typeof liveList[field] === 'undefined') delete publishedList[field];
        else publishedList[field] = liveList[field];
    });
    return { ...user, library, publishedVersion: version.version };
}

// library.lists.externalId is client-authored and not unique, so the owner comes from the snapshot,
// never from a query on the library. First publisher wins (see publishVersion's conflict rule).
async function getPublishedOwner(externalId) {
    const version = await getLatest(externalId);
    if (!version) return null;
    return (await db.users.findOne({ _id: version.ownerId })) || null;
}

async function getServedByExternalId(externalId) {
    const owner = await getPublishedOwner(externalId);
    return owner ? getServedUser(owner, externalId) : null;
}

function hydrateServed(served) {
    const library = new Library();
    library.load(served.library);
    const list = library.lists[0];
    library.defaultListId = list.id;
    return { library, list, served };
}

async function loadPublishedLibrary(user, externalId) {
    const served = await getServedUser(user, externalId);
    return served ? hydrateServed(served) : null;
}

async function loadPublishedLibraryByExternalId(externalId) {
    const served = await getServedByExternalId(externalId);
    return served ? hydrateServed(served) : null;
}

async function deleteVersionsForOwner(userId) {
    if (!db.listVersions || !userId) return;
    await db.listVersions.deleteMany({ ownerId: new ObjectId(userId) });
}

module.exports = {
    buildFrozenLibrary,
    hashFrozenLibrary,
    computeTotals,
    normalizeNote,
    getLatest,
    getLatestOwnedVersion,
    publishVersion,
    getPublishStatus,
    getServedUser,
    getPublishedOwner,
    getServedByExternalId,
    loadPublishedLibrary,
    loadPublishedLibraryByExternalId,
    deleteVersionsForOwner,
};
