const express = require('express');
const { ObjectId } = require('mongodb');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');

const { logWithRequest } = require('./log.js');
const { buildPublicProfile, buildPublicList } = require('./public-sharing.js');
const {
    incrementPublicListStat,
    rememberPublicListViewer,
} = require('./public-list-projections.js');
const { getServedByExternalId, getDeletedForkSources } = require('./list-versions.js');
const db = require('./db.js');

const router = express.Router();

function hashViewerPart(value) {
    return crypto.createHash('sha256').update(String(value || '')).digest('hex').slice(0, 32);
}

async function resolveViewerKey(req) {
    const token = req.cookies && req.cookies.lp;
    if (token) {
        try {
            const viewer = await db.users.findOne({ token });
            if (viewer && viewer._id) {
                return `user:${String(viewer._id)}`;
            }
        } catch (_) { /* ignore */ }
    }

    const userAgent = typeof req.get === 'function' ? req.get('user-agent') : '';
    // req.ip already follows the proxy settings; the raw header can be written by the visitor.
    const ip = String(req.ip || '').trim();
    return `anon:${hashViewerPart(`${ip}|${userAgent}`)}`;
}

router.get('/api/public/profile/:username', async (req, res) => {
    const username = String(req.params.username || '').toLowerCase().trim();
    if (!username) {
        return res.status(404).json({ message: 'Profile not found' });
    }

    try {
        const user = await db.users.findOne({ username });
        if (!user) {
            return res.status(404).json({ message: 'Profile not found' });
        }
        const payload = await buildPublicProfile(user);
        if (!payload) {
            return res.status(404).json({ message: 'Profile not found' });
        }

        // Gate enriched profile fields to Guide tier only
        const plan = (user.library && user.library.entitlements && user.library.entitlements.plan) || 'free';
        if (plan !== 'creator') {
            if (payload.profile) {
                payload.profile.bio = '';
                payload.profile.links = [];
                payload.profile.gearPhilosophy = [];
            }
        }

        const followerDocs = await db.follows.findMany({ followedId: new ObjectId(user._id) });
        const followingDocs = await db.follows.findMany({ followerId: new ObjectId(user._id) });
        payload.followerCount = followerDocs.length;
        payload.followingCount = followingDocs.length;

        return res.json(payload);
    } catch (err) {
        return res.status(500).json({ message: 'An error occurred' });
    }
});

router.get('/api/public/list/:externalId', async (req, res) => {
    const externalId = String(req.params.externalId || '').trim();
    if (!externalId) {
        return res.status(404).json({ message: 'List not found' });
    }

    try {
        const served = await getServedByExternalId(externalId);
        const payload = served ? buildPublicList(served, externalId) : null;
        if (!payload) {
            return res.status(404).json({ message: 'List not found' });
        }
        const stats = db.publicListStats ? await db.publicListStats.findOne({ externalId }) : null;
        payload.copyCount = Number(stats && stats.copyCount) || 0;
        // A copy whose source author deleted their account must not link to a page that cannot open.
        const goneSources = payload.forkedFrom ? await getDeletedForkSources({ library: { lists: [{ forkedFrom: payload.forkedFrom }] } }) : [];
        payload.sourceGone = goneSources.length > 0;
        return res.json(payload);
    } catch (err) {
        logWithRequest(req, { message: 'Public list snapshot error', externalId, error: err.message });
        return res.status(500).json({ message: 'An error occurred' });
    }
});

// A viewer is told apart by address and browser, so varying the browser would count as new
// viewers: the endpoint is capped per address instead.
const insightLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many events.' },
});

router.post('/api/public/insight', insightLimiter, async (req, res) => {
    const externalId = String(req.body.externalId || '').trim();
    const rawItemId = req.body.itemId;
    const itemIdIsValid = typeof rawItemId === 'undefined' || typeof rawItemId === 'string' || typeof rawItemId === 'number';
    const itemId = typeof rawItemId === 'undefined' ? '' : String(rawItemId);
    const type = String(req.body.type || '').trim();
    // Copies are counted by the copy route itself, never reported by a visitor.
    const allowedTypes = ['listView', 'gearClick', 'promoClick'];

    if (!externalId || !allowedTypes.includes(type) || !itemIdIsValid) {
        return res.status(400).json({ message: 'Invalid insight event' });
    }

    try {
        const served = await getServedByExternalId(externalId);
        if (!served || !buildPublicList(served, externalId)) {
            return res.status(200).json({ message: 'ok' });
        }

        if (type === 'listView') {
            const viewerKey = await resolveViewerKey(req);
            const isNewViewer = await rememberPublicListViewer(externalId, viewerKey);
            if (isNewViewer) {
                await incrementPublicListStat(externalId, 'viewCount');
            }
        } else if (itemId && ((served.library && served.library.items) || []).some((i) => String(i.id) === itemId)) {
            // Only items of this list: a visitor cannot invent counter names.
            if (type === 'gearClick') await incrementPublicListStat(externalId, `gearClicks.${itemId}`);
            if (type === 'promoClick') await incrementPublicListStat(externalId, `promoClicks.${itemId}`);
        }
    } catch (err) {
        logWithRequest(req, { message: 'Public insight error', externalId, error: err.message });
    }

    return res.json({ message: 'ok' });
});

module.exports = router;
