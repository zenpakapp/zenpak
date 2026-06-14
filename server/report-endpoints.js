// server/report-endpoints.js
const express = require('express');
const { ObjectId } = require('mongodb');
const router = express.Router();
const db = require('./db.js');
const auth = require('./auth.js');

const VALID_REASONS = ['spam', 'inappropriate', 'fake', 'other'];

// POST /api/reports — créer un signalement
router.post('/', (req, res) => {
    auth.authenticateUser(req, res, async (req, res, user) => {
        const { targetType, targetId, reason } = req.body || {};

        if (!['list', 'user'].includes(targetType)) {
            return res.status(400).json({ message: 'Invalid target type' });
        }
        if (!targetId || typeof targetId !== 'string') {
            return res.status(400).json({ message: 'Invalid target' });
        }
        if (!VALID_REASONS.includes(reason)) {
            return res.status(400).json({ message: 'Invalid reason' });
        }

        try {
            // Éviter les doublons — un user ne peut signaler le même target qu'une fois
            const existing = await db.reports.findOne({
                reporterId: new ObjectId(user._id),
                targetType,
                targetId: String(targetId),
            });
            if (existing) {
                return res.json({ ok: true, alreadyReported: true });
            }

            await db.reports.save({
                reporterId: new ObjectId(user._id),
                reporterUsername: user.username,
                targetType,
                targetId: String(targetId),
                reason,
                status: 'pending',
                createdAt: new Date(),
            });

            return res.json({ ok: true });
        } catch (err) {
            return res.status(500).json({ message: 'An error occurred' });
        }
    });
});

// GET /api/reports — liste des signalements (modérateurs uniquement)
router.get('/', (req, res) => {
    auth.authenticateModerator(req, res, async (req, res) => {
        try {
            const reports = await db.reports.findMany({ status: 'pending' });
            reports.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            return res.json({ reports });
        } catch (err) {
            return res.status(500).json({ message: 'An error occurred' });
        }
    });
});

// PATCH /api/reports/:id — résoudre un signalement (modérateurs uniquement)
router.patch('/:id', (req, res) => {
    auth.authenticateModerator(req, res, async (req, res) => {
        const { status } = req.body || {};
        if (!['resolved', 'dismissed'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }
        try {
            const report = await db.reports.findOne({ _id: new ObjectId(req.params.id) });
            if (!report) return res.status(404).json({ message: 'Not found' });
            report.status = status;
            report.resolvedAt = new Date();
            await db.reports.save(report);
            return res.json({ ok: true });
        } catch (err) {
            return res.status(500).json({ message: 'An error occurred' });
        }
    });
});

// POST /api/reports/ban/:username — bannir un user (modérateurs uniquement)
router.post('/ban/:username', (req, res) => {
    auth.authenticateModerator(req, res, async (req, res) => {
        const username = String(req.params.username || '').toLowerCase().trim();
        try {
            const user = await db.users.findOne({ username });
            if (!user) return res.status(404).json({ message: 'User not found' });
            user.banned = true;
            await db.users.save(user);
            return res.json({ ok: true });
        } catch (err) {
            return res.status(500).json({ message: 'An error occurred' });
        }
    });
});

// POST /api/reports/feature/:externalId — featured toggle (modérateurs uniquement)
router.post('/feature/:externalId', (req, res) => {
    auth.authenticateModerator(req, res, async (req, res) => {
        const externalId = String(req.params.externalId || '').trim();
        try {
            const owner = await db.users.findOne({ 'library.lists.externalId': externalId });
            if (!owner) return res.status(404).json({ message: 'List not found' });
            const list = (owner.library.lists || []).find(l => l.externalId === externalId);
            if (!list) return res.status(404).json({ message: 'List not found' });
            list.featured = !list.featured;
            await db.users.save(owner);
            return res.json({ ok: true, featured: list.featured });
        } catch (err) {
            return res.status(500).json({ message: 'An error occurred' });
        }
    });
});

// POST /api/reports/unpublish/:externalId — dépublier une liste (modérateurs uniquement)
router.post('/unpublish/:externalId', (req, res) => {
    auth.authenticateModerator(req, res, async (req, res) => {
        const externalId = String(req.params.externalId || '').trim();
        try {
            const owner = await db.users.findOne({ 'library.lists.externalId': externalId });
            if (!owner) return res.status(404).json({ message: 'List not found' });
            const list = (owner.library.lists || []).find(l => l.externalId === externalId);
            if (!list) return res.status(404).json({ message: 'List not found' });
            list.visibility = 'private';
            await db.users.save(owner);
            return res.json({ ok: true });
        } catch (err) {
            return res.status(500).json({ message: 'An error occurred' });
        }
    });
});

module.exports = router;
