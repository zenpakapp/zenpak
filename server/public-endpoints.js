const express = require('express');
const { ObjectId } = require('mongodb');
const crypto = require('crypto');

const { logWithRequest } = require('./log.js');
const { buildPublicProfile, buildPublicList } = require('./public-sharing.js');
const {
    incrementPublicListStat,
    rememberPublicListViewer,
} = require('./public-list-projections.js');
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

    const forwardedFor = typeof req.get === 'function' ? req.get('x-forwarded-for') : '';
    const userAgent = typeof req.get === 'function' ? req.get('user-agent') : '';
    const ip = String(forwardedFor || req.ip || '').split(',')[0].trim();
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
        const payload = buildPublicProfile(user);
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

router.get('/api/public/list/:externalId', (req, res) => {
    const externalId = String(req.params.externalId || '').trim();
    if (!externalId) {
        return res.status(404).json({ message: 'List not found' });
    }

    db.users.findOne({ 'library.lists.externalId': externalId }, (err, user) => {
        if (err) {
            logWithRequest(req, { message: 'Public list lookup error', externalId, error: err.message });
            return res.status(500).json({ message: 'An error occurred' });
        }

        const payload = buildPublicList(user, externalId);
        if (!payload) {
            return res.status(404).json({ message: 'List not found' });
        }

        return res.json(payload);
    });
});

router.post('/api/public/insight', (req, res) => {
    const externalId = String(req.body.externalId || '').trim();
    const itemId = typeof req.body.itemId === 'undefined' ? '' : req.body.itemId;
    const type = String(req.body.type || '').trim();
    const allowedTypes = ['listView', 'listCopy', 'gearClick', 'promoClick'];

    if (!externalId || !allowedTypes.includes(type) || typeof itemId !== 'string') {
        return res.status(400).json({ message: 'Invalid insight event' });
    }

    db.users.findOne({ 'library.lists.externalId': externalId }, async (err, user) => {
        if (err || !user || !user.library) {
            return res.status(200).json({ message: 'ok' });
        }

        if (!buildPublicList(user, externalId)) {
            return res.status(200).json({ message: 'ok' });
        }

        let shouldSave = true;
        if (type === 'listView') {
            const viewerKey = await resolveViewerKey(req);
            const isNewViewer = await rememberPublicListViewer(externalId, viewerKey);
            if (!isNewViewer) {
                shouldSave = false;
            } else {
                await incrementPublicListStat(externalId, 'viewCount');
            }
        } else if (type === 'listCopy') {
            await incrementPublicListStat(externalId, 'copyCount');
        } else if (type === 'gearClick' && itemId) {
            await incrementPublicListStat(externalId, `gearClicks.${itemId}`);
        } else if (type === 'promoClick' && itemId) {
            await incrementPublicListStat(externalId, `promoClicks.${itemId}`);
        }

        return res.json({ message: 'ok' });
    });
});

module.exports = router;
