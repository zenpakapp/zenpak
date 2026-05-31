// server/community-endpoints.js
const express = require('express');
const { ObjectId } = require('mongodb');
const router = express.Router();
const db = require('./db.js');
const { authenticateUser } = require('./auth.js');
const { getFeedForUser } = require('./feed-events.js');

// POST /api/community/follow/:username
router.post('/follow/:username', (req, res) => {
    authenticateUser(req, res, async (req, res, user) => {
        const targetUsername = String(req.params.username || '').toLowerCase().trim();
        if (!targetUsername || targetUsername === user.username) {
            return res.status(400).json({ message: 'Invalid target' });
        }

        const mode = req.body && req.body.mode === 'new-only' ? 'new-only' : 'all';

        try {
            const target = await db.users.findOne({ username: targetUsername });
            if (!target) {
                return res.status(404).json({ message: 'User not found' });
            }

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
                listId: e.listId,
                listName: listNameMap[e.listId] || '',
            }));

            return res.json({ events: enriched, nextCursor });
        } catch (err) {
            return res.status(500).json({ message: 'An error occurred' });
        }
    });
});

module.exports = router;
