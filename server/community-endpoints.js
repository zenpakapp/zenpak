// server/community-endpoints.js
const express = require('express');
const { ObjectId } = require('mongodb');

const router = express.Router();
const db = require('./db.js');
const auth = require('./auth.js');

const { authenticateUser } = auth;

const { getFeedForUser } = require('./feed-events.js');
const { createNotification } = require('./notifications.js');
const { normalizeTier } = require('./tier-policy.js');
const { getLatest } = require('./list-versions.js');
const { recordCopy } = require('./list-copies.js');
const {
    incrementPublicListStat,
    normalizeTagArray,
    projectionToDiscoverItem,
    publicDisplayName,
    syncUserPublicLists,
} = require('./public-list-projections.js');
const { parseQuery, prefixPatterns, scoreProjection } = require('./search-text.js');

// In-memory rate limiter: max 5 copies/hour per userId or IP
const COPY_RATE_LIMIT = 5;
const COPY_RATE_WINDOW_MS = 60 * 60 * 1000;
const copyRateMap = new Map();

function checkCopyRateLimit(key) {
    const now = Date.now();
    const windowStart = now - COPY_RATE_WINDOW_MS;
    const timestamps = (copyRateMap.get(key) || []).filter((t) => t > windowStart);
    if (timestamps.length >= COPY_RATE_LIMIT) {
        copyRateMap.set(key, timestamps);
        const retryAfterMs = COPY_RATE_WINDOW_MS - (now - timestamps[0]);
        return {
            limited: true,
            retryAfterMinutes: Math.max(1, Math.ceil(retryAfterMs / 60000)),
        };
    }
    timestamps.push(now);
    copyRateMap.set(key, timestamps);
    return { limited: false, remaining: COPY_RATE_LIMIT - timestamps.length };
}

function parseNumberParam(value) {
    if (typeof value === 'undefined' || value === null || value === '') return null;
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? number : null;
}

function normalizeCopiedQuantity(value) {
    const quantity = Number(value);
    return Number.isFinite(quantity) ? quantity : 1;
}

const DISCOVER_PAGE_SIZE = 20;
// Matches of a search that get ranked by relevance; the rest is cut off.
const SEARCH_CANDIDATE_LIMIT = 300;
const SEARCH_CURSOR = /^o:(\d+)$/;

// Everything but the date cursor runs in the database query, before any limit: filtering a
// pre-cut list of the newest 200 would hide every older list from the search and the filters.
function buildDiscoverQuery(filters, words) {
    const query = { visibility: { $in: ['discoverable', 'indexable'] } };
    if (filters.season) query.seasons = filters.season;
    if (filters.type) query.listTypes = filters.type;
    if (filters.duration) query.durations = filters.duration;
    if (filters.minWeight !== null || filters.maxWeight !== null) {
        query.totalBaseWeight = {};
        if (filters.minWeight !== null) query.totalBaseWeight.$gte = filters.minWeight;
        if (filters.maxWeight !== null) query.totalBaseWeight.$lte = filters.maxWeight;
    }
    if (words.length) {
        query.$and = prefixPatterns(words).map((pattern) => ({ searchTokens: pattern }));
    }
    return query;
}

// A search returns the most relevant lists first, the newest first among equals. The cursor is
// an offset into that ranking.
async function discoverSearch(filters, words, cursor, pageSize) {
    const candidates = await db.publicLists.findSorted(
        buildDiscoverQuery(filters, words),
        { updatedAt: -1 },
        SEARCH_CANDIDATE_LIMIT,
    );
    const ranked = candidates
        .map((list) => ({ list, score: scoreProjection(list, words) }))
        .filter((entry) => entry.score > 0)
        .sort((a, b) => b.score - a.score || new Date(b.list.updatedAt) - new Date(a.list.updatedAt));

    const offset = cursor ? Number(cursor.match(SEARCH_CURSOR)[1]) : 0;
    const end = offset + pageSize;
    return {
        lists: ranked.slice(offset, end).map((entry) => projectionToDiscoverItem(entry.list)),
        nextCursor: end < ranked.length ? `o:${end}` : null,
    };
}

// POST /api/community/follow/:username
router.post('/follow/:username', (req, res) => {
    authenticateUser(req, res, async (req, res, user) => {
        const targetUsername = String(req.params.username || '').toLowerCase().trim();
        if (!targetUsername || targetUsername === user.username) {
            return res.status(400).json({ message: 'Invalid target' });
        }

        const mode = req.body && req.body.mode === 'new-only' ? 'new-only' : 'all';

        const target = await db.users.findOne({ username: targetUsername });
        // A banned account cannot be followed: it does not exist for the community.
        if (!target || target.banned) {
            return res.status(404).json({ message: 'User not found' });
        }

        try {
            await db.follows.save({
                followerId: new ObjectId(user._id),
                followedId: new ObjectId(target._id),
                mode,
                createdAt: new Date(),
            });

            await createNotification({
                userId: target._id,
                type: 'follow',
                actorUsername: user.username,
                actorDisplayName: publicDisplayName(user),
                actorTier: (user.library && user.library.entitlements && user.library.entitlements.plan) || null,
            });

            return res.json({ following: true, mode });
        } catch (err) {
            if (err.code === 11000) {
                const existing = await db.follows.findOne({
                    followerId: new ObjectId(user._id),
                    followedId: new ObjectId(target._id),
                });
                return res.json({ following: true, mode: existing ? existing.mode : mode });
            }
            return res.status(500).json({ message: 'An error occurred' });
        }
    });
});

// DELETE /api/community/follow/:username
router.delete('/follow/:username', (req, res) => {
    authenticateUser(req, res, async (req, res, user) => {
        const targetUsername = String(req.params.username || '').toLowerCase().trim();

        try {
            const target = await db.users.findOne({ username: targetUsername });
            if (!target) {
                return res.status(404).json({ message: 'User not found' });
            }

            await db.follows.deleteOne({
                followerId: new ObjectId(user._id),
                followedId: new ObjectId(target._id),
            });

            return res.json({ following: false });
        } catch (err) {
            return res.status(500).json({ message: 'An error occurred' });
        }
    });
});

// GET /api/community/follow-status/:username
router.get('/follow-status/:username', (req, res) => {
    authenticateUser(req, res, async (req, res, user) => {
        const targetUsername = String(req.params.username || '').toLowerCase().trim();

        try {
            const target = await db.users.findOne({ username: targetUsername });
            if (!target || target.banned) {
                return res.json({ following: false, mode: null });
            }

            const follow = await db.follows.findOne({
                followerId: new ObjectId(user._id),
                followedId: new ObjectId(target._id),
            });

            return res.json({
                following: Boolean(follow),
                mode: follow ? follow.mode : null,
            });
        } catch (err) {
            return res.status(500).json({ message: 'An error occurred' });
        }
    });
});

// GET /api/community/feed?cursor=<ISO>
router.get('/feed', (req, res) => {
    authenticateUser(req, res, async (req, res, user) => {
        const cursor = req.query.cursor || null;
        if (cursor && Number.isNaN(Date.parse(cursor))) {
            return res.status(400).json({ message: 'Invalid cursor' });
        }

        try {
            const followDocs = await db.follows.findMany({ followerId: new ObjectId(user._id) });

            const followedIds = followDocs.map((f) => f.followedId);
            const modes = new Map(followDocs.map((f) => [f.followedId.toString(), f.mode]));

            const { events, nextCursor } = await getFeedForUser(followedIds, modes, cursor);

            if (events.length === 0) {
                return res.json({ events: [], nextCursor: null });
            }

            // Resolve usernames for event authors
            const authorIds = [...new Set(events.map((e) => e.userId.toString()))];
            const allAuthors = await db.users.findMany({ _id: { $in: authorIds.map((id) => new ObjectId(id)) } });
            // What a banned account published leaves the feed. Its follows stay stored, so it comes
            // back if the account is reinstated.
            const bannedIds = new Set(allAuthors.filter((a) => a.banned).map((a) => a._id.toString()));
            const authors = allAuthors.filter((a) => !a.banned);
            const authorMap = Object.fromEntries(authors.map((a) => [a._id.toString(), a.username]));
            const avatarMap = Object.fromEntries(authors.map((a) => [
                a._id.toString(),
                (a.library && a.library.publicProfile && a.library.publicProfile.avatarUrl) || '',
            ]));

            const tierMap = Object.fromEntries(authors.map((a) => {
                const plan = (a.library && a.library.entitlements && a.library.entitlements.plan) || 'free';
                return [a._id.toString(), normalizeTier(plan)];
            }));

            // Resolve list names from author docs (lists stored in user.library.lists)
            // Keyed by String(list.id) to match the plain-string listId stored in feed events
            const listNameMap = {};
            // Public id only for lists still shown in the community, so the client never links to a dead page
            const listExternalIdMap = {};
            authors.forEach((author) => {
                const lists = (author.library && author.library.lists) || [];
                lists.forEach((list) => {
                    if (list.id == null) return;
                    // Only lists shown in the community give their name to followers: a private,
                    // link-only or taken-down list does not.
                    if (list.takenDown || !(list.visibility === 'discoverable' || list.visibility === 'indexable')) return;
                    listNameMap[String(list.id)] = list.name;
                    if (list.externalId) {
                        listExternalIdMap[String(list.id)] = list.externalId;
                    }
                });
            });

            const enriched = events.filter((e) => !bannedIds.has(e.userId.toString())).map((e) => ({
                _id: e._id,
                type: e.type,
                createdAt: e.createdAt,
                author: authorMap[e.userId.toString()] || '',
                authorTier: tierMap[e.userId.toString()] || 'base',
                avatarUrl: avatarMap[e.userId.toString()] || '',
                listId: e.listId,
                listName: listNameMap[e.listId] || '',
                listExternalId: listExternalIdMap[e.listId] || '',
                listDeleted: !listNameMap[e.listId],
            }));

            return res.json({ events: enriched, nextCursor });
        } catch (err) {
            return res.status(500).json({ message: 'An error occurred' });
        }
    });
});

// GET /api/community/discover?sort=recent|popular&q=<text>&cursor=<ISO date | o:offset>
// With a search text the lists come by relevance (cursor `o:<offset>`), otherwise by `sort`
// (cursor: the ISO date of the last list of the page).
router.get('/discover', async (req, res) => {
    const sort = req.query.sort === 'popular' ? 'popular' : 'recent';
    const cursor = req.query.cursor || null;
    const isSearchCursor = Boolean(cursor) && SEARCH_CURSOR.test(cursor);
    if (cursor && !isSearchCursor && Number.isNaN(Date.parse(cursor))) {
        return res.status(400).json({ message: 'Invalid cursor' });
    }
    const rawQuery = String(req.query.q || '').trim();
    const words = parseQuery(rawQuery.slice(0, 100));
    const filters = {
        minWeight: parseNumberParam(req.query.minWeight),
        maxWeight: parseNumberParam(req.query.maxWeight),
        season: String(req.query.season || '').trim().toLowerCase().slice(0, 40),
        type: String(req.query.type || '').trim().toLowerCase().slice(0, 40),
        duration: String(req.query.duration || '').trim().toLowerCase().slice(0, 40),
    };

    try {
        const pageSize = Math.min(parseNumberParam(req.query.limit) || DISCOVER_PAGE_SIZE, DISCOVER_PAGE_SIZE);

        // A text with no usable word ("x") matches nothing, rather than everything.
        if (rawQuery && !words.length) {
            return res.json({ lists: [], nextCursor: null });
        }
        if (words.length) {
            return res.json(await discoverSearch(filters, words, isSearchCursor ? cursor : null, pageSize));
        }

        const query = buildDiscoverQuery(filters, words);
        if (sort === 'recent' && cursor && !isSearchCursor) {
            query.updatedAt = { $lt: new Date(cursor) };
        }
        const projections = await db.publicLists.findSorted(
            query,
            sort === 'popular' ? { viewCount: -1, updatedAt: -1 } : { updatedAt: -1 },
            pageSize,
        );

        const page = projections.map(projectionToDiscoverItem);
        const nextCursor = sort === 'recent' && page.length === pageSize ? page[page.length - 1].updatedAt : null;

        return res.json({ lists: page, nextCursor });
    } catch (err) {
        return res.status(500).json({ message: 'An error occurred' });
    }
});

// POST /api/community/copy-list/:externalId
router.post('/copy-list/:externalId', (req, res) => {
    // auth.authenticateUser via module ref so test stubs can be swapped at runtime
    auth.authenticateUser(req, res, async (req, res, user) => {
        const externalId = String(req.params.externalId || '').trim();
        if (!externalId) {
            return res.status(400).json({ message: 'Invalid list' });
        }

        try {
            const version = await getLatest(externalId);
            const owner = version ? await db.users.findOne({ _id: version.ownerId }) : null;
            if (!owner || owner.banned) {
                return res.status(404).json({ message: 'List not found' });
            }

            const sourceList = (owner.library.lists || []).find((l) => l.externalId === externalId);
            const isAlwaysCopyable = sourceList?.visibility === 'discoverable' || sourceList?.visibility === 'indexable';
            const isOptInCopyable = sourceList?.visibility === 'shareable' && sourceList?.copyable === true;
            if (!sourceList || (!isAlwaysCopyable && !isOptInCopyable)) {
                return res.status(404).json({ message: 'List not found' });
            }

            if (String(owner._id) === String(user._id)) {
                return res.status(403).json({ message: 'Cannot copy your own list' });
            }

            if (user.banned) {
                return res.status(403).json({ message: 'Account suspended' });
            }

            const published = version.library;
            const publishedList = (published.lists || [])[0] || {};
            const sharesPrice = Boolean(publishedList.publicFields && publishedList.publicFields.price);

            // Increment copyCount once per user (dedup via copiedBy array)
            const userId = String(user._id);
            if (!Array.isArray(sourceList.copiedBy)) sourceList.copiedBy = [];
            const alreadyCopied = sourceList.copiedBy.includes(userId);
            if (!alreadyCopied) {
                const rateLimitKey = user._id ? String(user._id) : (req.ip || 'anon');
                const rateLimit = checkCopyRateLimit(rateLimitKey);
                if (rateLimit.limited) {
                    res.set('Retry-After', String(rateLimit.retryAfterMinutes * 60));
                    return res.status(429).json({
                        message: 'Copy limit reached',
                        retryAfterMinutes: rateLimit.retryAfterMinutes,
                        limit: COPY_RATE_LIMIT,
                    });
                }

                sourceList.copiedBy.push(userId);
                sourceList.copyCount = (Number(sourceList.copyCount) || 0) + 1;
                // One atomic update on this list only. The filter on copiedBy makes a second copy
                // by the same member, started at the same time, count once; the rest of the owner's
                // account is not written.
                await db.users.updateOne(
                    { _id: owner._id },
                    { $inc: { 'library.lists.$[l].copyCount': 1 }, $push: { 'library.lists.$[l].copiedBy': userId } },
                    { arrayFilters: [{ 'l.id': sourceList.id, 'l.copiedBy': { $ne: userId } }] },
                );
                await incrementPublicListStat(sourceList.externalId, 'copyCount');
                syncUserPublicLists(owner).catch(() => {});

                await createNotification({
                    userId: owner._id,
                    type: 'copy',
                    actorUsername: user.username,
                    actorDisplayName: publicDisplayName(user),
                    actorTier: (user.library && user.library.entitlements && user.library.entitlements.plan) || null,
                    listName: sourceList.name,
                });
            }

            // Return the published list data (categories + items) for client-side dedup import
            const categoryIds = (publishedList.categoryIds || []).map(String);
            const categories = (published.categories || [])
                .filter((c) => categoryIds.includes(String(c.id)))
                .map((c) => ({
                    sourceCategoryId: c.id,
                    name: c.name,
                    categoryItems: (c.categoryItems || []).map((ci) => {
                        const item = (published.items || []).find((i) => String(i.id) === String(ci.itemId));
                        if (!item) return null;
                        return {
                            sourceItemId: item.id,
                            name: item.name || '',
                            description: item.description || '',
                            weight: Number(item.weight) || 0,
                            authorUnit: item.authorUnit || 'g',
                            price: sharesPrice ? Number(item.price) || 0 : 0,
                            brand: item.brand || '',
                            shop: item.shop || '',
                            url: item.url || '',
                            affiliateUrl: item.affiliateUrl || '',
                            promoCode: item.promoCode || '',
                            promoLabel: item.promoLabel || '',
                            imageUrl: item.imageUrl || '',
                            qty: normalizeCopiedQuantity(ci.qty),
                            worn: ci.worn || 0,
                            consumable: ci.consumable === true,
                            star: ci.star || 0,
                        };
                    }).filter(Boolean),
                }));

            const ownerName = (owner.library && owner.library.publicProfile && owner.library.publicProfile.displayName) || owner.username;
            const sourceCurrencySymbol = published.currencySymbol || '$';
            const listName = publishedList.name || sourceList.name;
            const forkedFrom = {
                externalId: sourceList.externalId,
                ownerId: String(owner._id),
                ownerUsername: owner.username,
                ownerName,
                listName,
                sourceCurrencySymbol,
                copiedAt: new Date().toISOString(),
                version: version.version,
            };
            // Registered on every copy (not just the first), so a later copy of a newer
            // version can be tracked too. The client cannot vouch for forkedFrom.version.
            await recordCopy(user._id, sourceList.externalId, version.version);

            return res.json({
                listName,
                description: publishedList.description || '',
                seasons: normalizeTagArray(publishedList.seasons),
                listTypes: normalizeTagArray(publishedList.listTypes),
                durations: normalizeTagArray(publishedList.durations),
                sourceCurrencySymbol,
                categories,
                forkedFrom,
            });
        } catch (err) {
            return res.status(500).json({ message: 'An error occurred' });
        }
    });
});

// GET /api/community/insights — Guide (creator plan) only
router.get('/insights', (req, res) => {
    auth.authenticateUser(req, res, async (req, res, user) => {
        const plan = (user.library && user.library.entitlements && user.library.entitlements.plan) || 'free';
        if (plan !== 'creator') {
            return res.status(403).json({ message: 'Wayfarer tier required' });
        }

        try {
            const publicLists = ((user.library && user.library.lists) || []).filter(
                (l) => l.externalId && (l.visibility === 'discoverable' || l.visibility === 'indexable'),
            );

            const statsDocs = await db.publicListStats.findMany({ externalId: { $in: publicLists.map((l) => l.externalId) } });
            const statsByExternalId = Object.fromEntries(statsDocs.map((s) => [s.externalId, s]));

            const listsData = publicLists.map((l) => {
                const stats = statsByExternalId[l.externalId] || {};
                return {
                    externalId: l.externalId,
                    name: l.name || '',
                    viewCount: stats.viewCount || 0,
                    copyCount: stats.copyCount || 0,
                };
            });

            const totalViews = listsData.reduce((sum, l) => sum + l.viewCount, 0);
            const totalCopies = listsData.reduce((sum, l) => sum + l.copyCount, 0);

            const followDocs = await db.follows.findMany({ followedId: new ObjectId(user._id) });

            return res.json({
                totals: {
                    followers: followDocs.length,
                    views: totalViews,
                    copies: totalCopies,
                },
                lists: listsData,
            });
        } catch (err) {
            return res.status(500).json({ message: 'An error occurred' });
        }
    });
});

// GET /api/community/users?q=
router.get('/users', async (req, res) => {
    const rawQ = String(req.query.q || '').trim().slice(0, 100);
    const q = rawQ.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const PROJECT = {
        _id: 0,
        username: 1,
        displayName: { $ifNull: ['$library.publicProfile.displayName', '$username'] },
        // The bio is a Guide feature, as on the public profile page.
        bio: {
            $cond: [
                { $eq: [{ $ifNull: ['$library.entitlements.plan', 'free'] }, 'creator'] },
                { $ifNull: ['$library.publicProfile.bio', ''] },
                '',
            ],
        },
        avatarUrl: { $ifNull: ['$library.publicProfile.avatarUrl', ''] },
        plan: { $ifNull: ['$library.entitlements.plan', 'free'] },
    };

    // Date of the most recent public list, used to break ties and to order the default view
    const LATEST_LIST = {
        $max: {
            $map: {
                input: {
                    $filter: {
                        input: { $ifNull: ['$library.lists', []] },
                        as: 'l',
                        cond: { $in: ['$$l.visibility', ['discoverable', 'indexable']] },
                    },
                },
                as: 'l',
                in: '$$l.dateUpdated',
            },
        },
    };

    // 0 = exact name, 1 = name starts with the query, 2 = name contains it
    const matchesName = (regex) => ({
        $or: [
            { $regexMatch: { input: '$username', regex, options: 'i' } },
            { $regexMatch: { input: { $ifNull: ['$library.publicProfile.displayName', ''] }, regex, options: 'i' } },
        ],
    });
    const RANK = {
        $switch: {
            branches: [
                { case: matchesName(`^${q}$`), then: 0 },
                { case: matchesName(`^${q}`), then: 1 },
            ],
            default: 2,
        },
    };

    try {
        const PAGE_SIZE = 20;
        const MAX_SKIP = 1000;
        const skip = Math.min(Math.max(parseInt(req.query.skip, 10) || 0, 0), MAX_SKIP);
        // One row past the page tells whether another page exists
        const page = [
            ...(skip ? [{ $skip: skip }] : []),
            { $limit: PAGE_SIZE + 1 },
            { $project: PROJECT },
        ];
        let pipeline;

        if (!q) {
            // Default: discoverable/indexable profiles sorted by most recent public list
            pipeline = [
                { $match: { 'library.publicProfile.visibility': { $in: ['discoverable', 'indexable'] }, banned: { $ne: true } } },
                { $addFields: { _latestList: LATEST_LIST } },
                { $sort: { _latestList: -1, username: 1 } },
                ...page,
            ];
        } else {
            pipeline = [
                {
                    $match: {
                        $or: [
                            { username: { $regex: q, $options: 'i' } },
                            { 'library.publicProfile.displayName': { $regex: q, $options: 'i' } },
                        ],
                        banned: { $ne: true },
                        // Link-only profiles are found by their exact username only, not by browsing.
                        $and: [{
                            $or: [
                                { 'library.publicProfile.visibility': { $in: ['discoverable', 'indexable'] } },
                                { 'library.publicProfile.visibility': 'shareable', username: rawQ.toLowerCase() },
                            ],
                        }],
                    },
                },
                { $addFields: { _rank: RANK, _latestList: LATEST_LIST } },
                { $sort: { _rank: 1, _latestList: -1, username: 1 } },
                ...page,
            ];
        }

        const users = await db.users.aggregate(pipeline);
        const normalized = users.slice(0, PAGE_SIZE).map((u) => ({
            ...u,
            tier: normalizeTier(u.plan),
            plan: undefined,
        }));

        return res.json({ users: normalized, hasMore: users.length > PAGE_SIZE });
    } catch (err) {
        return res.status(500).json({ message: 'An error occurred' });
    }
});

module.exports = router;
