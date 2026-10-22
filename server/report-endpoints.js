// server/report-endpoints.js
const express = require('express');
const { ObjectId } = require('mongodb');

const router = express.Router();
const db = require('./db.js');
const auth = require('./auth.js');
const { syncUserPublicLists } = require('./public-list-projections.js');
const { getPublishedOwner } = require('./list-versions.js');
const { noticeListUnpublished, noticeAccountBanned, noticeAccountRestored } = require('./moderation-notices.js');

const VALID_REASONS = ['spam', 'inappropriate', 'fake', 'other'];
const TARGET_TYPES = ['list', 'user'];
const REPORTS_PAGE_SIZE = 50;
const MAX_SKIP = 5000;
const REPORTER_SAMPLE = 5;

// One line per reported target: how many reports it has, why, who reported, and the latest date.
function groupReports(reports) {
    const groups = new Map();
    reports.forEach((report) => {
        const key = `${report.targetType}:${report.targetId}`;
        let group = groups.get(key);
        if (!group) {
            group = {
                targetType: report.targetType,
                targetId: report.targetId,
                count: 0,
                reasons: {},
                reporters: [],
                latestAt: report.createdAt,
            };
            groups.set(key, group);
        }
        group.count += 1;
        group.reasons[report.reason] = (group.reasons[report.reason] || 0) + 1;
        if (group.reporters.length < REPORTER_SAMPLE && !group.reporters.includes(report.reporterUsername)) {
            group.reporters.push(report.reporterUsername);
        }
        if (new Date(report.createdAt) > new Date(group.latestAt)) group.latestAt = report.createdAt;
    });
    // Most reported first, then the most recent
    return [...groups.values()].sort((a, b) => b.count - a.count || new Date(b.latestAt) - new Date(a.latestAt));
}

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

// GET /api/reports?type=&reason=&skip= — signalements en attente, groupés par cible (modérateurs uniquement)
router.get('/', (req, res) => {
    auth.authenticateModerator(req, res, async (req, res) => {
        try {
            const { type, reason } = req.query;
            const skip = Math.min(Math.max(parseInt(req.query.skip, 10) || 0, 0), MAX_SKIP);
            const pending = await db.reports.findMany({ status: 'pending' });
            const matching = pending.filter((report) => (!TARGET_TYPES.includes(type) || report.targetType === type)
                && (!VALID_REASONS.includes(reason) || report.reason === reason));
            const groups = groupReports(matching);
            const page = groups.slice(skip, skip + REPORTS_PAGE_SIZE);
            // A list group names its author, so the moderator can ban them without typing a name.
            // The stored report is left as it is; null when the list is no longer published.
            const withOwner = await Promise.all(page.map(async (group) => {
                if (group.targetType !== 'list') return group;
                const owner = await getPublishedOwner(group.targetId).catch(() => null);
                return { ...group, targetOwnerUsername: owner ? owner.username : null };
            }));
            return res.json({ reports: withOwner, total: groups.length, hasMore: skip + REPORTS_PAGE_SIZE < groups.length });
        } catch (err) {
            return res.status(500).json({ message: 'An error occurred' });
        }
    });
});

// PATCH /api/reports/target — résoudre tous les signalements en attente d'une cible (modérateurs uniquement)
// Declared before /:id so that "target" is not read as a report id.
router.patch('/target', (req, res) => {
    auth.authenticateModerator(req, res, async (req, res) => {
        const { targetType, targetId, status } = req.body || {};
        if (!['resolved', 'dismissed'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }
        if (!TARGET_TYPES.includes(targetType)) {
            return res.status(400).json({ message: 'Invalid target type' });
        }
        if (!targetId || typeof targetId !== 'string') {
            return res.status(400).json({ message: 'Invalid target' });
        }
        try {
            const reports = await db.reports.findMany({ status: 'pending', targetType, targetId });
            const resolvedAt = new Date();
            await Promise.all(reports.map((report) => db.reports.save({ ...report, status, resolvedAt })));
            return res.json({ ok: true, updated: reports.length });
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
// A ban ends the session, takes the account's lists out of Discover and search, and stops its
// public pages and sign-in. Nothing is deleted: a ban can be lifted. A moderator cannot be banned.
router.post('/ban/:username', (req, res) => {
    auth.authenticateModerator(req, res, async (req, res) => {
        const username = String(req.params.username || '').toLowerCase().trim();
        try {
            const user = await db.users.findOne({ username });
            if (!user) return res.status(404).json({ message: 'User not found' });
            if (auth.isModerator(user.username)) {
                return res.status(409).json({ message: 'A moderator cannot be banned.', code: 'moderator' });
            }
            const wasBanned = Boolean(user.banned);
            user.banned = true;
            user.token = null;
            await db.users.save(user);
            syncUserPublicLists(user).catch(() => {});
            if (!wasBanned) noticeAccountBanned(user).catch(() => {});
            return res.json({ ok: true });
        } catch (err) {
            return res.status(500).json({ message: 'An error occurred' });
        }
    });
});

// POST /api/reports/unban/:username — rétablir un compte banni (modérateurs uniquement)
router.post('/unban/:username', (req, res) => {
    auth.authenticateModerator(req, res, async (req, res) => {
        const username = String(req.params.username || '').toLowerCase().trim();
        try {
            const user = await db.users.findOne({ username });
            if (!user) return res.status(404).json({ message: 'User not found' });
            const wasBanned = Boolean(user.banned);
            user.banned = false;
            await db.users.save(user);
            syncUserPublicLists(user).catch(() => {});
            if (wasBanned) noticeAccountRestored(user).catch(() => {});
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
            const owner = await getPublishedOwner(externalId);
            if (!owner) return res.status(404).json({ message: 'List not found' });
            const list = (owner.library.lists || []).find((l) => l.externalId === externalId);
            if (!list) return res.status(404).json({ message: 'List not found' });
            list.featured = !list.featured;
            await db.users.save(owner);
            syncUserPublicLists(owner).catch(() => {});
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
            const owner = await getPublishedOwner(externalId);
            if (!owner) return res.status(404).json({ message: 'List not found' });
            const list = (owner.library.lists || []).find((l) => l.externalId === externalId);
            if (!list) return res.status(404).json({ message: 'List not found' });
            const wasPrivate = list.visibility === 'private';
            list.visibility = 'private';
            // The owner cannot publish it again until a moderator lifts this.
            list.takenDown = true;
            await db.users.save(owner);
            syncUserPublicLists(owner).catch(() => {});
            if (!wasPrivate) noticeListUnpublished(owner, list).catch(() => {});
            return res.json({ ok: true });
        } catch (err) {
            return res.status(500).json({ message: 'An error occurred' });
        }
    });
});

// POST /api/reports/lift/:externalId — lets the owner publish a list taken down again (moderators only)
router.post('/lift/:externalId', (req, res) => {
    auth.authenticateModerator(req, res, async (req, res) => {
        const externalId = String(req.params.externalId || '').trim();
        try {
            const owner = await getPublishedOwner(externalId);
            if (!owner) return res.status(404).json({ message: 'List not found' });
            const list = ((owner.library && owner.library.lists) || []).find((l) => l.externalId === externalId);
            if (!list) return res.status(404).json({ message: 'List not found' });
            delete list.takenDown;
            await db.users.save(owner);
            return res.json({ ok: true });
        } catch (err) {
            return res.status(500).json({ message: 'An error occurred' });
        }
    });
});

module.exports = router;
