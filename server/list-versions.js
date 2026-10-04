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
// Fork provenance that is safe to publish. The fork owner's sync state (version, itemLinks,
// categoryLinks, dismissedVersion) is private and must not churn the content hash.
const PUBLISHED_FORKED_FROM_FIELDS = [
    'externalId', 'ownerId', 'ownerUsername', 'ownerName', 'listName', 'sourceCurrencySymbol', 'copiedAt',
];
const SHARE_SETTING_FIELDS = ['visibility', 'allowSearchIndexing', 'copyable', 'publicFields'];
// Library-level fields that reflect live account state (profile display name, plan, unit/
// currency preferences, affiliate rules) rather than this list's content — overlaid live in
// getServedUser (the library-level analogue of SHARE_SETTING_FIELDS) and excluded from the
// content hash, so an account-wide change doesn't flag every shared list as unpublished.
const LIBRARY_LEVEL_LIVE_FIELDS = ['publicProfile', 'entitlements', 'totalUnit', 'itemUnit', 'currencySymbol', 'creator'];
// Library-wide fields excluded from the hash but with no live-relevant rendering to overlay:
// sequence is an internal id counter, optionalFields is a display preference already baked
// into the frozen library's own rendering.
const NON_CONTENT_LIBRARY_FIELDS = ['sequence', 'optionalFields', ...LIBRARY_LEVEL_LIVE_FIELDS];
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
    const publishedList = pickFields(list, PUBLISHED_LIST_FIELDS);
    if (publishedList.forkedFrom && typeof publishedList.forkedFrom === 'object') {
        publishedList.forkedFrom = pickFields(publishedList.forkedFrom, PUBLISHED_FORKED_FROM_FIELDS);
    }

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
        lists: [publishedList],
    });
}

// Share settings are overlaid live at read time, so they are not part of the content hash.
function hashFrozenLibrary(frozen) {
    const forHash = clone(frozen);
    forHash.lists.forEach((list) => {
        SHARE_SETTING_FIELDS.forEach((field) => { delete list[field]; });
    });
    NON_CONTENT_LIBRARY_FIELDS.forEach((field) => { delete forHash[field]; });
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

async function getVersion(externalId, version) {
    if (!externalId || !Number.isInteger(version) || !db.listVersions) return null;
    return (await db.listVersions.findOne({ externalId, version })) || null;
}

async function getLatestOwnedVersion(user, externalId) {
    const latest = await getLatest(externalId);
    if (!latest || String(latest.ownerId) !== String(user._id)) return null;
    return latest;
}

// Latest version number and owner per externalId, in one query.
async function getLatestVersions(externalIds) {
    const ids = [...new Set((externalIds || []).filter(Boolean))];
    if (!ids.length || !db.listVersions) return new Map();
    const rows = await db.listVersions.aggregate([
        { $match: { externalId: { $in: ids } } },
        { $sort: { version: -1 } },
        { $group: { _id: '$externalId', version: { $first: '$version' }, ownerId: { $first: '$ownerId' } } },
    ]);
    return new Map(rows.map((row) => [row._id, { version: row.version, ownerId: row.ownerId }]));
}

function isTrackedFork(list) {
    const forkedFrom = list && list.forkedFrom;
    return Boolean(forkedFrom && forkedFrom.externalId && Number.isInteger(forkedFrom.version) && forkedFrom.version > 0);
}

// Computed on read, never stored: forks whose source has published a newer version and is
// still public. A source that is private or gone yields no entry, so nothing leaks.
async function getForkUpdates(user) {
    const forks = ((user && user.library && user.library.lists) || []).filter(isTrackedFork);
    if (!forks.length) return [];

    const latest = await getLatestVersions(forks.map((list) => list.forkedFrom.externalId));
    const ownerIds = [...new Set([...latest.values()].map((row) => String(row.ownerId)))].filter((id) => ObjectId.isValid(id));
    if (!ownerIds.length) return [];
    // Only the lists are needed to check the source is still public.
    const owners = await db.users.findMany(
        { _id: { $in: ownerIds.map((id) => new ObjectId(id)) } },
        { projection: { 'library.lists': 1 } },
    );
    const ownersById = new Map(owners.map((owner) => [String(owner._id), owner]));

    return forks.reduce((updates, list) => {
        const { externalId, version: forkedVersion, ownerId: copiedOwnerId } = list.forkedFrom;
        const row = latest.get(externalId);
        if (!row || row.version <= forkedVersion) return updates;
        // externalId is client-authored and can be reused after an account deletion: only
        // report updates from the account this list was actually copied from.
        if (!copiedOwnerId || String(copiedOwnerId) !== String(row.ownerId)) return updates;
        const owner = ownersById.get(String(row.ownerId));
        const sourceList = owner ? findLiveList(owner, externalId) : null;
        if (!sourceList || !isPublicVisibility(sourceList.visibility)) return updates;
        updates.push({
            listId: list.id, sourceExternalId: externalId, forkedVersion, latestVersion: row.version,
        });
        return updates;
    }, []);
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

// Live identity + frozen content of one version + live share settings.
function buildServedUser(user, liveList, version) {
    const library = clone(version.library);
    const publishedList = library.lists[0];
    SHARE_SETTING_FIELDS.forEach((field) => {
        if (typeof liveList[field] === 'undefined') delete publishedList[field];
        else publishedList[field] = liveList[field];
    });
    const liveLibrary = user.library || {};
    LIBRARY_LEVEL_LIVE_FIELDS.forEach((field) => {
        if (typeof liveLibrary[field] === 'undefined') delete library[field];
        else library[field] = liveLibrary[field];
    });
    return { ...user, library, publishedVersion: version.version };
}

// Null unless the list is currently shared AND has a snapshot owned by this user.
// Public readers use this instead of the live library.
async function getServedUser(user, externalId) {
    const liveList = findLiveList(user, externalId);
    if (!liveList || !isPublicVisibility(liveList.visibility)) return null;

    const version = await getLatestOwnedVersion(user, externalId);
    if (!version) return null;
    return buildServedUser(user, liveList, version);
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
    SHARE_SETTING_FIELDS,
    buildFrozenLibrary,
    hashFrozenLibrary,
    computeTotals,
    normalizeNote,
    findLiveList,
    isTrackedFork,
    buildServedUser,
    getLatest,
    getVersion,
    getLatestOwnedVersion,
    getLatestVersions,
    getForkUpdates,
    publishVersion,
    getPublishStatus,
    getServedUser,
    getPublishedOwner,
    getServedByExternalId,
    loadPublishedLibrary,
    loadPublishedLibraryByExternalId,
    deleteVersionsForOwner,
};
