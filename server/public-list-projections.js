const { ObjectId } = require('mongodb');

const db = require('./db.js');
const { normalizeTier } = require('./tier-policy.js');
const { getLatestOwnedVersion } = require('./list-versions.js');
const { buildSearchTokens } = require('./search-text.js');
const { clipDescription } = require('./text-limits.js');

function normalizeTagArray(value) {
    if (!Array.isArray(value)) return [];
    return value
        .map((tag) => String(tag || '').trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 12);
}

function publicDisplayName(user) {
    const profile = user && user.library && user.library.publicProfile;
    const displayName = profile && typeof profile.displayName === 'string' ? profile.displayName.trim() : '';
    return displayName || (user && user.username) || '';
}

function isDiscoverableVisibility(visibility) {
    return visibility === 'discoverable' || visibility === 'indexable';
}

// Names and brands of the items a list actually contains (not the rest of the library).
function listItemTexts(sourceLibrary, list) {
    const categories = Array.isArray(sourceLibrary.categories) ? sourceLibrary.categories : [];
    const items = Array.isArray(sourceLibrary.items) ? sourceLibrary.items : [];
    const listItems = (list.categoryIds || [])
        .map((categoryId) => categories.find((c) => c.id === categoryId))
        .flatMap((category) => (category && category.categoryItems) || [])
        .map((categoryItem) => items.find((i) => i.id === categoryItem.itemId))
        .filter(Boolean);
    return {
        itemNames: listItems.map((item) => item.name).filter(Boolean),
        itemBrands: listItems.map((item) => item.brand).filter(Boolean),
    };
}

function buildPublicListProjection(user, list, stats = {}, version = null) {
    const library = user.library || {};
    const profile = library.publicProfile || {};
    const plan = (library.entitlements && library.entitlements.plan) || 'free';
    const published = (version && version.library && version.library.lists && version.library.lists[0]) || list;
    const totals = version && version.totals;
    const forkedFrom = published.forkedFrom || null;
    const updatedAt = version ? version.publishedAt : (list.updatedAt || list.dateUpdated || new Date(0));
    const { itemNames, itemBrands } = listItemTexts(version && version.library ? version.library : library, published);
    const ownerDisplayName = profile.displayName || user.username || '';

    return {
        searchTokens: buildSearchTokens({
            name: published.name,
            description: clipDescription(published.description),
            ownerDisplayName,
            ownerUsername: user.username,
            itemNames,
            itemBrands,
        }),
        externalId: list.externalId,
        ownerId: new ObjectId(user._id),
        ownerUsername: user.username || '',
        ownerDisplayName: profile.displayName || user.username || '',
        ownerTier: normalizeTier(plan),
        name: published.name || '',
        description: clipDescription(published.description),
        visibility: list.visibility || 'private',
        totalBaseWeight: totals ? Number(totals.baseWeight) || 0 : Number(list.totalBaseWeight) || 0,
        totalQty: totals ? Number(totals.qty) || 0 : Number(list.totalQty) || 0,
        seasons: normalizeTagArray(published.seasons),
        listTypes: normalizeTagArray(published.listTypes),
        copyCount: Number(stats.copyCount ?? list.copyCount) || 0,
        viewCount: Number(stats.viewCount ?? list.viewCount) || 0,
        featured: Boolean(list.featured),
        sourceOwnerName: forkedFrom && forkedFrom.ownerUsername !== user.username
            ? (forkedFrom.ownerName || forkedFrom.ownerUsername || '')
            : '',
        sourceOwnerUsername: forkedFrom && forkedFrom.ownerUsername !== user.username
            ? (forkedFrom.ownerUsername || '')
            : '',
        forkedFrom: forkedFrom ? {
            externalId: forkedFrom.externalId || '',
            ownerUsername: forkedFrom.ownerUsername || '',
            ownerName: forkedFrom.ownerName || '',
            listName: forkedFrom.listName || '',
            sourceCurrencySymbol: forkedFrom.sourceCurrencySymbol || '',
            copiedAt: forkedFrom.copiedAt || '',
        } : null,
        updatedAt: new Date(updatedAt),
        projectedAt: new Date(),
    };
}

function projectionToDiscoverItem(projection) {
    const updatedAt = projection.updatedAt ? new Date(projection.updatedAt) : new Date(0);
    return {
        externalId: projection.externalId,
        name: projection.name || '',
        description: projection.description || '',
        totalBaseWeight: Number(projection.totalBaseWeight) || 0,
        totalQty: Number(projection.totalQty) || 0,
        author: projection.ownerUsername || '',
        authorDisplayName: projection.ownerDisplayName || projection.ownerUsername || '',
        authorTier: projection.ownerTier || 'base',
        sourceOwnerName: projection.sourceOwnerName || '',
        sourceOwnerUsername: projection.sourceOwnerUsername || '',
        copyCount: Number(projection.copyCount) || 0,
        viewCount: Number(projection.viewCount) || 0,
        seasons: normalizeTagArray(projection.seasons),
        listTypes: normalizeTagArray(projection.listTypes),
        updatedAt: updatedAt.toISOString(),
        featured: Boolean(projection.featured),
    };
}

async function getListStats(externalId) {
    if (!externalId || !db.publicListStats || !db.publicListStats.findOne) {
        return {};
    }
    return (await db.publicListStats.findOne({ externalId })) || {};
}

async function syncUserPublicLists(user) {
    if (!user || !user._id || !user.library || !db.publicLists) return;

    // A banned account has nothing in Discover or search; its lists are projected again if it is reinstated.
    if (user.banned) {
        await db.publicLists.deleteMany({ ownerId: new ObjectId(user._id) });
        return;
    }

    const lists = Array.isArray(user.library.lists) ? user.library.lists : [];
    const projectedExternalIds = [];

    for (const list of lists) {
        if (!list.externalId) continue;
        const version = isDiscoverableVisibility(list.visibility)
            ? await getLatestOwnedVersion(user, list.externalId)
            : null;
        if (!version) {
            await db.publicLists.deleteOne({ externalId: list.externalId, ownerId: new ObjectId(user._id) });
            continue;
        }
        const stats = await getListStats(list.externalId);
        const projection = buildPublicListProjection(user, list, stats, version);
        await db.publicLists.updateOne(
            { externalId: list.externalId },
            { $set: projection },
            { upsert: true },
        );
        projectedExternalIds.push(list.externalId);
    }

    await db.publicLists.deleteMany({
        ownerId: new ObjectId(user._id),
        externalId: { $nin: projectedExternalIds },
    });
}

async function incrementPublicListStat(externalId, field, amount = 1) {
    if (!externalId || !field || !db.publicListStats) return;
    await db.publicListStats.updateOne(
        { externalId },
        {
            $inc: { [field]: amount },
            $set: { updatedAt: new Date() },
            $setOnInsert: { externalId, createdAt: new Date() },
        },
        { upsert: true },
    );
    if (db.publicLists && (field === 'viewCount' || field === 'copyCount')) {
        await db.publicLists.updateOne(
            { externalId },
            { $inc: { [field]: amount }, $set: { projectedAt: new Date() } },
        );
    }
}

async function rememberPublicListViewer(externalId, viewerKey, limit = 500) {
    if (!externalId || !viewerKey || !db.publicListViewers) return true;
    try {
        await db.publicListViewers.save({
            externalId,
            viewerKey,
            createdAt: new Date(),
        });
        const viewers = await db.publicListViewers.findSorted(
            { externalId },
            { createdAt: -1 },
            limit + 1,
        );
        if (viewers.length > limit) {
            const stale = viewers.slice(limit);
            await Promise.all(stale.map((v) => db.publicListViewers.deleteOne({ _id: v._id })));
        }
        return true;
    } catch (err) {
        if (err && err.code === 11000) return false;
        throw err;
    }
}

// Projections written before Discover search existed have no `searchTokens`, so the search
// would never find them. Rebuild them from their owners; returns how many were missing.
async function reindexMissingSearchTokens() {
    if (!db.publicLists || !db.publicLists.findMany || !db.users) return 0;
    const missing = await db.publicLists.findMany({ searchTokens: { $exists: false } });
    if (!missing.length) return 0;

    const ownerIds = [...new Set(missing.map((projection) => String(projection.ownerId)))]
        .map((id) => new ObjectId(id));
    const owners = await db.users.findMany({ _id: { $in: ownerIds } });
    // One owner at a time: this runs at startup and must not flood the database.
    await owners.reduce((previous, owner) => previous.then(() => syncUserPublicLists(owner)), Promise.resolve());
    return missing.length;
}

module.exports = {
    buildPublicListProjection,
    incrementPublicListStat,
    normalizeTagArray,
    projectionToDiscoverItem,
    publicDisplayName,
    reindexMissingSearchTokens,
    rememberPublicListViewer,
    syncUserPublicLists,
};
