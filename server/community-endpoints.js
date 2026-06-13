// server/community-endpoints.js
const express = require('express');
const { ObjectId } = require('mongodb');
const router = express.Router();
const db = require('./db.js');
const auth = require('./auth.js');
const { authenticateUser } = auth;

const { getFeedForUser } = require('./feed-events.js');

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
    const q = String(req.query.q || '').trim().slice(0, 100) || null;

    try {
        const PAGE_SIZE = 20;

        if (sort === 'popular') {
            const pipeline = [
                { $unwind: '$library.lists' },
                { $match: (() => {
                    const match = {
                        'library.lists.visibility': { $in: ['discoverable', 'indexable'] },
                        'library.lists.externalId': { $exists: true },
                    };
                    if (q) {
                        match['library.lists.name'] = { $regex: q, $options: 'i' };
                    }
                    return match;
                })() },
                { $sort: { 'library.lists.copyCount': -1 } },
                { $limit: PAGE_SIZE },
                { $project: {
                    _id: 0,
                    externalId: '$library.lists.externalId',
                    name: '$library.lists.name',
                    description: { $ifNull: ['$library.lists.description', ''] },
                    copyCount: { $ifNull: ['$library.lists.copyCount', 0] },
                    totalBaseWeight: { $ifNull: ['$library.lists.totalBaseWeight', 0] },
                    totalQty: { $ifNull: ['$library.lists.totalQty', 0] },
                    updatedAt: '$library.lists.updatedAt',
                    author: '$username',
                    authorTier: { $ifNull: ['$library.entitlements.plan', 'free'] },
                } },
            ];

            const items = await db.users.aggregate(pipeline);

            // Normalize authorTier: plan values → tier labels
            const normalized = items.map((item) => {
                let tier = 'base';
                if (item.authorTier === 'creator') tier = 'guide';
                else if (item.authorTier === 'supporter') tier = 'trail';
                return { ...item, authorTier: tier };
            });

            return res.json({ lists: normalized, nextCursor: null });
        }

        // sort === 'recent': cursor-based, full-scan filtered in JS
        const allUsers = await db.users.findMany({});

        const items = [];
        for (const user of allUsers) {
            const lists = (user.library && user.library.lists) || [];
            const plan = (user.library && user.library.entitlements && user.library.entitlements.plan) || 'free';
            let tier = 'base';
            if (plan === 'creator') tier = 'guide';
            else if (plan === 'supporter') tier = 'trail';

            for (const list of lists) {
                if (!list.externalId) continue;
                if (list.visibility !== 'discoverable' && list.visibility !== 'indexable') continue;
                if (q && !list.name.toLowerCase().includes(q.toLowerCase())) continue;

                const updatedAt = list.updatedAt ? new Date(list.updatedAt) : new Date(0);
                if (cursor && updatedAt >= new Date(cursor)) continue;

                items.push({
                    externalId: list.externalId,
                    name: list.name || '',
                    description: list.description || '',
                    totalBaseWeight: Number(list.totalBaseWeight) || 0,
                    totalQty: Number(list.totalQty) || 0,
                    author: user.username || '',
                    authorTier: tier,
                    copyCount: Number(list.copyCount) || 0,
                    updatedAt: updatedAt.toISOString(),
                });
            }
        }

        items.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

        const page = items.slice(0, PAGE_SIZE);
        const nextCursor = page.length === PAGE_SIZE ? page[page.length - 1].updatedAt : null;

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
            return res.status(403).json({ message: 'Guide tier required' });
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

module.exports = router;
