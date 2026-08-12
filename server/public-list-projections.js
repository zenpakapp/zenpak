const { ObjectId } = require('mongodb');

const db = require('./db.js');
const { normalizeTier } = require('./tier-policy.js');

function normalizeTagArray(value) {
    if (!Array.isArray(value)) return [];
    return value
        .map(tag => String(tag || '').trim().toLowerCase())
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

function buildPublicListProjection(user, list, stats = {}) {
    const library = user.library || {};
    const profile = library.publicProfile || {};
    const plan = (library.entitlements && library.entitlements.plan) || 'free';
    const forkedFrom = list.forkedFrom || null;
    const updatedAt = list.updatedAt || list.dateUpdated || new Date(0);

    return {
        externalId: list.externalId,
        ownerId: new ObjectId(user._id),
        ownerUsername: user.username || '',
        ownerDisplayName: profile.displayName || user.username || '',
        ownerTier: normalizeTier(plan),
        name: list.name || '',
        description: list.description || '',
        visibility: list.visibility || 'private',
        totalBaseWeight: Number(list.totalBaseWeight) || 0,
        totalQty: Number(list.totalQty) || 0,
        seasons: normalizeTagArray(list.seasons),
        listTypes: normalizeTagArray(list.listTypes),
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

    const lists = Array.isArray(user.library.lists) ? user.library.lists : [];
    const publicExternalIds = lists
        .filter(list => list.externalId && isDiscoverableVisibility(list.visibility))
        .map(list => list.externalId);

    for (const list of lists) {
        if (!list.externalId) continue;
        if (!isDiscoverableVisibility(list.visibility)) {
            await db.publicLists.deleteOne({ externalId: list.externalId });
            continue;
        }
        const stats = await getListStats(list.externalId);
        const projection = buildPublicListProjection(user, list, stats);
        await db.publicLists.updateOne(
            { externalId: list.externalId },
            { $set: projection },
            { upsert: true }
        );
    }

    await db.publicLists.deleteMany({
        ownerId: new ObjectId(user._id),
        externalId: { $nin: publicExternalIds },
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
        { upsert: true }
    );
    if (db.publicLists && (field === 'viewCount' || field === 'copyCount')) {
        await db.publicLists.updateOne(
            { externalId },
            { $inc: { [field]: amount }, $set: { projectedAt: new Date() } }
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
            limit + 1
        );
        if (viewers.length > limit) {
            const stale = viewers.slice(limit);
            await Promise.all(stale.map(v => db.publicListViewers.deleteOne({ _id: v._id })));
        }
        return true;
    } catch (err) {
        if (err && err.code === 11000) return false;
        throw err;
    }
}

module.exports = {
    buildPublicListProjection,
    incrementPublicListStat,
    normalizeTagArray,
    projectionToDiscoverItem,
    publicDisplayName,
    rememberPublicListViewer,
    syncUserPublicLists,
};
