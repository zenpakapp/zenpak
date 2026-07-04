const crypto = require('crypto');
const express = require('express');

const { logWithRequest } = require('./log.js');
const { authenticateUser } = require('./auth.js');
const { detectVisibilityChanges } = require('./save-library-feed.js');
const db = require('./db.js');
const dataTypes = require('../client/dataTypes.js');

const Library = dataTypes.Library;

const router = express.Router();

const EXTERNAL_ID_ALPHABET = '1234567890abcdefghijklmnopqrstuvwxyz';

router.post('/saveLibrary', (req, res) => {
    authenticateUser(req, res, saveLibrary);
});

function saveLibrary(req, res, user) {
    if (typeof req.body.syncToken === 'undefined') {
        logWithRequest(req, { message: 'Missing syncToken', username: user.username });
        return res.status(400).send('Please refresh this page to upgrade to the latest version of LighterPack.');
    }
    if (!req.body.username || !req.body.data) {
        logWithRequest(req, { message: 'bad save: missing username or data', username: user.username });
        return res.status(400).json({ message: 'An error occurred while saving your data. Please refresh your browser and try again.' });
    }

    if (req.body.username != user.username) {
        logWithRequest(req, { message: 'bad save: bad username', initatedby: user.username, initiatedfor: req.body.username });
        return res.status(401).json({ message: 'An error occurred while saving your data. Please refresh your browser and login again.' });
    }

    if (req.body.syncToken != user.syncToken) {
        logWithRequest(req, { message: 'out of date syncToken', username: user.username });
        return res.status(400).json({ message: 'Your list is out of date - please refresh your browser.' });
    }

    let library;
    try {
        library = JSON.parse(req.body.data);
    } catch (e) {
        logWithRequest(req, { message: 'Library parsing issue', username: user.username });
        return res.status(400).json({ errors: [{ message: 'An error occurred while saving your data - unable to parse library. If this persists, please contact support.' }] });
    }

    const oldLists = (user.library && user.library.lists) || [];

    if (!user.emailVerified && library && library.lists) {
        const { isPublicVisibility } = require('../client/services/public-visibility.js');
        const storedVisibilityMap = {};
        oldLists.forEach((l) => { storedVisibilityMap[l.id] = l.visibility; });
        const escalatesVisibility = library.lists.some((l) => (
            isPublicVisibility(l.visibility) && !isPublicVisibility(storedVisibilityMap[l.id])
        ));
        if (escalatesVisibility) {
            return res.status(403).json({ errors: [{ message: 'Please verify your email before making lists public.' }] });
        }
    }

    const now = new Date();
    if (library && library.lists) {
        library.lists.forEach((list) => {
            if (!list.updatedAt) list.updatedAt = now;
        });
    }

    user.library = library;
    user.syncToken++;
    db.users.save(user, () => {
        logWithRequest(req, { message: 'saved library', username: user.username });

        const newLists = (library && library.lists) || [];
        detectVisibilityChanges(user._id, oldLists, newLists).catch(() => {});

        return res.status(200).json({ message: 'success', syncToken: user.syncToken });
    });
}

router.post('/externalId', (req, res) => {
    authenticateUser(req, res, externalId);
});

function externalId(req, res, user) {
    const id = Array.from(crypto.randomBytes(6), (byte) => EXTERNAL_ID_ALPHABET[byte % EXTERNAL_ID_ALPHABET.length]).join('');
    logWithRequest(req, { message: 'Id generated', id });

    db.users.find({ 'library.lists.externalId': id }, (err, users) => {
        if (err) {
            logWithRequest(req, { message: 'Id lookup error', id });
            res.status(500).send('An error occurred.');
            return;
        }

        if (!users.length) {
            if (typeof user.externalIds === 'undefined') user.externalIds = [id];
            else user.externalIds.push(id);

            db.users.save(user);
            logWithRequest(req, { message: 'Id saved', id, username: user.username });
            res.status(200).json({ externalId: id });
        } else {
            logWithRequest(req, { message: 'Id collision detected', id });
            externalId(req, res, user);
        }
    });
}

router.get('/api/backup', (req, res) => {
    authenticateUser(req, res, (req, res, user) => {
        const filename = `zenpak-backup-${user.username}-${new Date().toISOString().slice(0, 10)}.json`;
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.json({ username: user.username, exportedAt: new Date().toISOString(), library: user.library });
    });
});

router.post('/api/import/lighterpack', async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'No URL provided.' });

    const match = String(url).match(/lighterpack\.com\/r\/([a-zA-Z0-9]+)/);
    if (!match) return res.status(400).json({ error: 'Invalid LighterPack URL. Expected: lighterpack.com/r/xxxxx' });

    const id = match[1];
    let response;
    try {
        response = await fetch(`https://lighterpack.com/csv/${id}`, {
            headers: { 'User-Agent': 'ZenPak Importer/1.0' },
            signal: AbortSignal.timeout(10000),
        });
    } catch {
        return res.status(502).json({ error: 'Could not reach LighterPack. Check your connection.' });
    }

    if (!response.ok) {
        return res.status(400).json({ error: 'List not found or not downloadable on LighterPack.' });
    }

    const csv = await response.text();
    const disposition = response.headers.get('content-disposition') || '';
    const nameMatch = disposition.match(/filename=([^;]+)\.csv/i);
    const name = nameMatch ? nameMatch[1].replace(/_/g, ' ').trim() : id;
    return res.json({ csv, name });
});

module.exports = router;
