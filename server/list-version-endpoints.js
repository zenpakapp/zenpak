const express = require('express');

const auth = require('./auth.js');
const { logWithRequest } = require('./log.js');
const {
    publishVersion, getPublishStatus, getForkUpdates, getDeletedForkSources,
} = require('./list-versions.js');
const { getForkDiff, loadForkPayloads } = require('./fork-diff.js');
const { recordCopy } = require('./list-copies.js');
const { syncUserPublicLists } = require('./public-list-projections.js');
const { createRateLimiter } = require('./rate-limiter.js');

const router = express.Router();

// Soft limit: 30 publishes/hour per user (the "apply:" keys share it)
const publishLimiter = createRateLimiter({ limit: 30, windowMs: 60 * 60 * 1000 });

router.post('/api/lists/:externalId/publish', (req, res) => {
    auth.authenticateUser(req, res, async (req, res, user) => {
        const externalId = String(req.params.externalId || '').trim();

        const rate = publishLimiter.check(String(user._id));
        if (rate.limited) {
            res.set('Retry-After', String(rate.retryAfterMinutes * 60));
            return res.status(429).json({ message: 'Publish limit reached', retryAfterMinutes: rate.retryAfterMinutes });
        }

        try {
            const result = await publishVersion(user, externalId, req.body && req.body.note);
            if (result.error === 'not-found') return res.status(404).json({ message: 'List not found' });
            if (result.error === 'private') return res.status(400).json({ message: 'Share the list before publishing' });
            if (result.error === 'conflict') return res.status(409).json({ message: 'Could not publish this list' });

            if (result.created) {
                syncUserPublicLists(user).catch((err) => {
                    logWithRequest(req, { message: 'public list projection sync failed after publish', username: user.username, error: err.message });
                });
            }
            return res.json({ version: result.version, created: result.created, publishedAt: result.publishedAt });
        } catch (err) {
            logWithRequest(req, { message: 'publish failed', username: user.username, externalId, error: err.message });
            return res.status(500).json({ message: 'An error occurred' });
        }
    });
});

router.get('/api/lists/:externalId/publish-status', (req, res) => {
    auth.authenticateUser(req, res, async (req, res, user) => {
        const externalId = String(req.params.externalId || '').trim();
        try {
            const status = await getPublishStatus(user, externalId);
            if (!status) return res.status(404).json({ message: 'List not found' });
            return res.json(status);
        } catch (err) {
            logWithRequest(req, { message: 'publish status failed', username: user.username, externalId, error: err.message });
            return res.status(500).json({ message: 'An error occurred' });
        }
    });
});

router.get('/api/lists/fork-updates', (req, res) => {
    auth.authenticateUser(req, res, async (req, res, user) => {
        try {
            return res.json({ updates: await getForkUpdates(user), deletedSources: await getDeletedForkSources(user) });
        } catch (err) {
            logWithRequest(req, { message: 'fork updates failed', username: user.username, error: err.message });
            return res.status(500).json({ message: 'An error occurred' });
        }
    });
});

router.get('/api/lists/fork-diff/:listId', (req, res) => {
    auth.authenticateUser(req, res, async (req, res, user) => {
        const listId = String(req.params.listId || '').trim();
        try {
            const result = await getForkDiff(user, listId);
            if (!result) return res.status(404).json({ message: 'Not found' });
            return res.json(result);
        } catch (err) {
            logWithRequest(req, {
                message: 'fork diff failed', username: user.username, listId, error: err.message,
            });
            return res.status(500).json({ message: 'An error occurred' });
        }
    });
});

router.get('/api/lists/fork-apply/:listId', (req, res) => {
    auth.authenticateUser(req, res, async (req, res, user) => {
        const listId = String(req.params.listId || '').trim();
        try {
            const loaded = await loadForkPayloads(user, listId);
            if (!loaded) return res.status(404).json({ message: 'Not found' });
            return res.json({
                sourceExternalId: loaded.externalId,
                fromVersion: loaded.fromVersion,
                toVersion: loaded.toVersion,
                currencySymbol: loaded.currencySymbol,
                base: loaded.basePayload,
                latest: loaded.latestPayload,
            });
        } catch (err) {
            logWithRequest(req, {
                message: 'fork apply data failed', username: user.username, listId, error: err.message,
            });
            return res.status(500).json({ message: 'An error occurred' });
        }
    });
});

router.post('/api/lists/fork-apply/:listId/record', (req, res) => {
    auth.authenticateUser(req, res, async (req, res, user) => {
        const listId = String(req.params.listId || '').trim();
        const version = req.body && req.body.version;
        if (!Number.isInteger(version) || version < 1) return res.status(400).json({ message: 'Invalid version' });

        const rate = publishLimiter.check(`apply:${String(user._id)}`);
        if (rate.limited) {
            res.set('Retry-After', String(rate.retryAfterMinutes * 60));
            return res.status(429).json({ message: 'Update limit reached', retryAfterMinutes: rate.retryAfterMinutes });
        }

        try {
            const loaded = await loadForkPayloads(user, listId);
            if (!loaded) return res.status(404).json({ message: 'Not found' });
            // Same eligibility as /copy-list: discoverable/indexable, or shareable and opted in to copying.
            const { liveList } = loaded;
            const copyable = liveList.visibility === 'discoverable' || liveList.visibility === 'indexable'
                || (liveList.visibility === 'shareable' && liveList.copyable === true);
            if (!copyable || user.banned) return res.status(404).json({ message: 'Not found' });
            // Only the current latest can be registered: that is what the caller was just served.
            if (version !== loaded.toVersion) return res.status(409).json({ message: 'Not the latest version' });
            await recordCopy(user._id, loaded.externalId, version);
            return res.json({ recorded: true, version });
        } catch (err) {
            logWithRequest(req, {
                message: 'fork apply record failed', username: user.username, listId, error: err.message,
            });
            return res.status(500).json({ message: 'An error occurred' });
        }
    });
});

module.exports = router;
