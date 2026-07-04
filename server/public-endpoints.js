const express = require('express');
const { ObjectId } = require('mongodb');

const { logWithRequest } = require('./log.js');
const { buildPublicProfile, buildPublicList } = require('./public-sharing.js');
const db = require('./db.js');

const router = express.Router();

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

    db.users.findOne({ 'library.lists.externalId': externalId }, (err, user) => {
        if (err || !user || !user.library) {
            return res.status(200).json({ message: 'ok' });
        }

        if (!buildPublicList(user, externalId)) {
            return res.status(200).json({ message: 'ok' });
        }

        if (!user.library.insights) {
            user.library.insights = {};
        }

        const insights = user.library.insights;
        if (typeof insights.profileViews !== 'number') insights.profileViews = 0;
        if (!insights.listViews || typeof insights.listViews !== 'object') insights.listViews = {};
        if (!insights.listCopies || typeof insights.listCopies !== 'object') insights.listCopies = {};
        if (!insights.gearClicks || typeof insights.gearClicks !== 'object') insights.gearClicks = {};
        if (!insights.promoClicks || typeof insights.promoClicks !== 'object') insights.promoClicks = {};

        if (type === 'listView') {
            insights.listViews[externalId] = (insights.listViews[externalId] || 0) + 1;
        } else if (type === 'listCopy') {
            insights.listCopies[externalId] = (insights.listCopies[externalId] || 0) + 1;
        } else if (type === 'gearClick' && itemId) {
            insights.gearClicks[itemId] = (insights.gearClicks[itemId] || 0) + 1;
        } else if (type === 'promoClick' && itemId) {
            insights.promoClicks[itemId] = (insights.promoClicks[itemId] || 0) + 1;
        }

        db.users.save(user, (saveErr) => {
            if (saveErr) {
                logWithRequest(req, { message: 'Public insight save error', externalId, error: saveErr.message });
                return res.status(500).json({ message: 'An error occurred' });
            }
            return res.json({ message: 'ok' });
        });
    });
});

module.exports = router;
