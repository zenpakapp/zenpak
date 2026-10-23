const express = require('express');
const { ObjectId } = require('mongodb');

const router = express.Router();
const db = require('./db.js');
const { writeFields } = require('./user-field-writes.js');
const auth = require('./auth.js');

// GET /api/notifications — liste les notifications du user connecté
router.get('/', (req, res) => {
    auth.authenticateUser(req, res, async (req, res, user) => {
        try {
            const all = await db.notifications.findMany(
                { userId: new ObjectId(user._id) },
            );
            // What a banned account did is left out, and not counted. It stays stored, so it
            // comes back if the account is reinstated.
            const actors = [...new Set(all.map((n) => n.actorUsername).filter(Boolean))];
            const banned = actors.length
                ? new Set((await db.users.findMany({ username: { $in: actors }, banned: true })).map((u) => u.username))
                : new Set();
            const notes = all.filter((n) => !banned.has(n.actorUsername));
            // tri par date desc, max 50
            notes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            const page = notes.slice(0, 50);
            const unreadCount = page.filter((n) => !n.read).length;
            const prefs = user.notificationPrefs || { follow: true, copy: true };
            return res.json({ notifications: page, unreadCount, prefs });
        } catch (err) {
            return res.status(500).json({ message: 'An error occurred' });
        }
    });
});

// POST /api/notifications/read-all — marque toutes comme lues
router.post('/read-all', (req, res) => {
    auth.authenticateUser(req, res, async (req, res, user) => {
        try {
            await db.notifications.updateMany(
                { userId: new ObjectId(user._id), read: false },
                { $set: { read: true } },
            );
            return res.json({ ok: true });
        } catch (err) {
            return res.status(500).json({ message: 'An error occurred' });
        }
    });
});

// DELETE /api/notifications — supprime toutes les notifications du user connecté
router.delete('/', (req, res) => {
    auth.authenticateUser(req, res, async (req, res, user) => {
        try {
            await db.notifications.deleteMany({ userId: new ObjectId(user._id) });
            return res.json({ ok: true });
        } catch (err) {
            return res.status(500).json({ message: 'An error occurred' });
        }
    });
});

// PATCH /api/notifications/prefs
router.patch('/prefs', (req, res) => {
    auth.authenticateUser(req, res, async (req, res, user) => {
        const { follow, copy } = req.body || {};
        const prefs = {
            follow: follow !== false,
            copy: copy !== false,
        };
        try {
            user.notificationPrefs = prefs;
            await writeFields(user, ['notificationPrefs']);
            return res.json({ prefs });
        } catch (err) {
            return res.status(500).json({ message: 'An error occurred' });
        }
    });
});

module.exports = router;
