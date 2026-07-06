// server/community-endpoints.js
const express = require('express');
const { ObjectId } = require('mongodb');
const router = express.Router();
const db = require('./db.js');
const auth = require('./auth.js');
const { authenticateUser } = auth;

const { getFeedForUser } = require('./feed-events.js');
const { createNotification } = require('./notifications.js');

// In-memory rate limiter: max 5 copies/hour per userId or IP
const COPY_RATE_LIMIT = 5;
const COPY_RATE_WINDOW_MS = 60 * 60 * 1000;
const copyRateMap = new Map();

function isCopyRateLimited(key) {
    const now = Date.now();
    const windowStart = now - COPY_RATE_WINDOW_MS;
    const timestamps = (copyRateMap.get(key) || []).filter(t => t > windowStart);
    if (timestamps.length >= COPY_RATE_LIMIT) {
        copyRateMap.set(key, timestamps);
        return true;
    }
    timestamps.push(now);
    copyRateMap.set(key, timestamps);
    return false;
}

function normalizeTagArray(value) {
    if (!Array.isArray(value)) return [];
    return value
        .map(tag => String(tag || '').trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 12);
}

function normalizeTier(plan) {
    if (plan === 'creator') return 'guide';
    if (plan === 'supporter') return 'trail';
    return 'base';
}

function parseNumberParam(value) {
    if (typeof value === 'undefined' || value === null || value === '') return null;
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? number : null;
}

function listMatchesFilters(list, filters) {
    if (filters.q && !String(list.name || '').toLowerCase().includes(filters.q)) return false;
    const totalBaseWeight = Number(list.totalBaseWeight) || 0;
    if (filters.minWeight !== null && totalBaseWeight < filters.minWeight) return false;
    if (filters.maxWeight !== null && totalBaseWeight > filters.maxWeight) return false;
    const seasons = normalizeTagArray(list.seasons);
    const listTypes = normalizeTagArray(list.listTypes);
    if (filters.season && !seasons.includes(filters.season)) return false;
    if (filters.type && !listTypes.includes(filters.type)) return false;
    return true;
}

function buildDiscoverItem(user, list) {
    const insights = (user.library && user.library.insights) || {};
    const listViews = insights.listViews || {};
    const plan = (user.library && user.library.entitlements && user.library.entitlements.plan) || 'free';
    const updatedAt = list.updatedAt ? new Date(list.updatedAt) : new Date(0);

    return {
        externalId: list.externalId,
        name: list.name || '',
        description: list.description || '',
        totalBaseWeight: Number(list.totalBaseWeight) || 0,
        totalQty: Number(list.totalQty) || 0,
        author: user.username || '',
        authorTier: normalizeTier(plan),
        copyCount: Number(list.copyCount) || 0,
        viewCount: Number(listViews[list.externalId] || list.viewCount) || 0,
        seasons: normalizeTagArray(list.seasons),
        listTypes: normalizeTagArray(list.listTypes),
        updatedAt: updatedAt.toISOString(),
        featured: Boolean(list.featured),
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
        if (!target) {
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
            if (!target) {
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
        if (cursor && isNaN(Date.parse(cursor))) {
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
            const authors = await db.users.findMany({ _id: { $in: authorIds.map((id) => new ObjectId(id)) } });
            const authorMap = Object.fromEntries(authors.map((a) => [a._id.toString(), a.username]));

            const tierMap = Object.fromEntries(authors.map((a) => {
                const plan = (a.library && a.library.entitlements && a.library.entitlements.plan) || 'free';
                let tier = 'base';
                if (plan === 'creator') tier = 'guide';
                else if (plan === 'supporter') tier = 'trail';
                return [a._id.toString(), tier];
            }));

            // Resolve list names from author docs (lists stored in user.library.lists)
            // Keyed by String(list.id) to match the plain-string listId stored in feed events
            const listNameMap = {};
            for (const author of authors) {
                const lists = (author.library && author.library.lists) || [];
                for (const list of lists) {
                    if (list.id != null) listNameMap[String(list.id)] = list.name;
                }
            }

            const enriched = events.map((e) => ({
                _id: e._id,
                type: e.type,
                createdAt: e.createdAt,
                author: authorMap[e.userId.toString()] || '',
                authorTier: tierMap[e.userId.toString()] || 'base',
                listId: e.listId,
                listName: listNameMap[e.listId] || '',
                listDeleted: !listNameMap[e.listId],
            }));

            return res.json({ events: enriched, nextCursor });
        } catch (err) {
            return res.status(500).json({ message: 'An error occurred' });
        }
    });
});

// GET /api/community/discover?sort=recent|popular&cursor=<ISO>
router.get('/discover', async (req, res) => {
    const sort = req.query.sort === 'popular' ? 'popular' : 'recent';
    const cursor = req.query.cursor || null;
    if (cursor && isNaN(Date.parse(cursor))) {
        return res.status(400).json({ message: 'Invalid cursor' });
    }
    const filters = {
        q: String(req.query.q || '').trim().toLowerCase().slice(0, 100),
        minWeight: parseNumberParam(req.query.minWeight),
        maxWeight: parseNumberParam(req.query.maxWeight),
        season: String(req.query.season || '').trim().toLowerCase().slice(0, 40),
        type: String(req.query.type || '').trim().toLowerCase().slice(0, 40),
    };

    try {
        const PAGE_SIZE = Math.min(parseNumberParam(req.query.limit) || 20, 20);
        const allUsers = await db.users.findMany({});
        const items = [];

        for (const user of allUsers) {
            const lists = (user.library && user.library.lists) || [];
            for (const list of lists) {
                if (!list.externalId) continue;
                if (list.visibility !== 'discoverable' && list.visibility !== 'indexable') continue;
                if (!listMatchesFilters(list, filters)) continue;

                const updatedAt = list.updatedAt ? new Date(list.updatedAt) : new Date(0);
                if (sort === 'recent' && cursor && updatedAt >= new Date(cursor)) continue;

                items.push(buildDiscoverItem(user, list));
            }
        }

        if (sort === 'popular') {
            items.sort((a, b) => {
                if (b.viewCount !== a.viewCount) return b.viewCount - a.viewCount;
                return new Date(b.updatedAt) - new Date(a.updatedAt);
            });
        } else {
            items.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        }

        const page = items.slice(0, PAGE_SIZE);
        const nextCursor = sort === 'recent' && page.length === PAGE_SIZE ? page[page.length - 1].updatedAt : null;

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
            const owner = await db.users.findOne({ 'library.lists.externalId': externalId });
            if (!owner) {
                return res.status(404).json({ message: 'List not found' });
            }

            const sourceList = (owner.library.lists || []).find(l => l.externalId === externalId);
            if (!sourceList || (sourceList.visibility !== 'discoverable' && sourceList.visibility !== 'indexable')) {
                return res.status(404).json({ message: 'List not found' });
            }

            if (String(owner._id) === String(user._id)) {
                return res.status(403).json({ message: 'Cannot copy your own list' });
            }

            if (user.banned) {
                return res.status(403).json({ message: 'Account suspended' });
            }

            const rateLimitKey = user._id ? String(user._id) : (req.ip || 'anon');
            if (isCopyRateLimited(rateLimitKey)) {
                return res.status(429).json({ message: 'Too many copies, try again later' });
            }

            // Increment copyCount once per user (dedup via copiedBy array)
            const userId = String(user._id);
            if (!Array.isArray(sourceList.copiedBy)) sourceList.copiedBy = [];
            if (!sourceList.copiedBy.includes(userId)) {
                sourceList.copiedBy.push(userId);
                sourceList.copyCount = (Number(sourceList.copyCount) || 0) + 1;
                await db.users.save(owner);

                await createNotification({
                    userId: owner._id,
                    type: 'copy',
                    actorUsername: user.username,
                    listName: sourceList.name,
                });
            }

            // Return list data (categories + items) for client-side dedup import
            const categoryIds = sourceList.categoryIds || [];
            const categories = (owner.library.categories || [])
                .filter(c => categoryIds.includes(c.id) || categoryIds.map(String).includes(String(c.id)))
                .map(c => ({
                    name: c.name,
                    categoryItems: (c.categoryItems || []).map(ci => {
                        const item = (owner.library.items || []).find(i => String(i.id) === String(ci.itemId));
                        if (!item) return null;
                        return {
                            name: item.name || '',
                            description: item.description || '',
                            weight: Number(item.weight) || 0,
                            authorUnit: item.authorUnit || 'g',
                            price: Number(item.price) || 0,
                            brand: item.brand || '',
                            shop: item.shop || '',
                            imageUrl: item.imageUrl || '',
                            qty: Number(ci.qty) || 1,
                            worn: ci.worn || 0,
                            consumable: ci.consumable === true,
                            star: ci.star || 0,
                        };
                    }).filter(Boolean),
                }));

            return res.json({
                listName: sourceList.name,
                description: sourceList.description || '',
                categories,
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
            const insights = (user.library && user.library.insights) || {};
            const listViews = insights.listViews || {};
            const listCopies = insights.listCopies || {};

            const publicLists = ((user.library && user.library.lists) || []).filter(
                l => l.externalId && (l.visibility === 'discoverable' || l.visibility === 'indexable')
            );

            const listsData = publicLists.map(l => ({
                externalId: l.externalId,
                name: l.name || '',
                viewCount: listViews[l.externalId] || 0,
                copyCount: listCopies[l.externalId] || 0,
            }));

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
    const q = String(req.query.q || '').trim().slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (!q) return res.json({ users: [] });

    try {
        const PAGE_SIZE = 20;
        const pipeline = [
            { $match: {
                username: { $regex: q, $options: 'i' },
                $or: [
                    { 'library.profile.visibility': { $exists: false } },
                    { 'library.profile.visibility': { $in: ['public', 'discoverable'] } },
                ],
            }},
            { $limit: PAGE_SIZE },
            { $project: {
                _id: 0,
                username: 1,
                displayName: { $ifNull: ['$library.profile.displayName', '$username'] },
                bio: { $ifNull: ['$library.profile.bio', ''] },
                avatarUrl: { $ifNull: ['$library.profile.avatarUrl', ''] },
                plan: { $ifNull: ['$library.entitlements.plan', 'free'] },
            }},
        ];

        const users = await db.users.aggregate(pipeline);
        const normalized = users.map(u => ({
            ...u,
            tier: u.plan === 'creator' ? 'guide' : u.plan === 'supporter' ? 'trail' : 'base',
            plan: undefined,
        }));

        return res.json({ users: normalized });
    } catch (err) {
        return res.status(500).json({ message: 'An error occurred' });
    }
});

module.exports = router;
