/**
 * Unit test: banning and reinstating an account (POST /api/reports/ban/:username and /unban/:username).
 * A ban ends the account's session and takes its lists out of Discover; a moderator cannot be
 * banned; a ban can be lifted.
 * Run with: node test/unit-ban-endpoints.js
 */

'use strict';

process.env.NODE_CONFIG = JSON.stringify({
    environment: 'test',
    stripeSecretKey: '',
    stripeWebhookSecret: '',
    kofiWebhookToken: '',
    databaseUrl: 'localhost/test',
    deployUrl: 'http://localhost:3000',
});

const assert = require('assert');
const { stubServerModule } = require('./fixtures/list-versions-fixtures.js');

const accounts = {};
const saved = [];
const synced = [];
stubServerModule('db.js', {
    users: {
        findOne(query) { return Promise.resolve(accounts[query.username] || null); },
        save(user) { saved.push(user); return Promise.resolve(user); },
    },
    reports: {},
});
let caller = { moderator: true };
stubServerModule('auth.js', {
    authenticateUser() {},
    authenticateModerator(req, res, callback) {
        if (!caller.moderator) return res.status(403).json({ message: 'Denied.' });
        return callback(req, res, { username: 'mod' });
    },
    isModerator(username) { return username === 'mod' || username === 'fxbenard'; },
});
stubServerModule('public-list-projections.js', {
    syncUserPublicLists(user) { synced.push([user.username, Boolean(user.banned)]); return Promise.resolve(); },
});
stubServerModule('list-versions.js', { getPublishedOwner() { return Promise.resolve(null); } });

const router = require('../server/report-endpoints.js');

function post(path, params) {
    const layer = router.stack.find((l) => l.route && l.route.path === path && l.route.methods.post);
    assert.ok(layer, `${path} exists`);
    return new Promise((resolve) => {
        const res = {
            statusCode: 200,
            status(code) { this.statusCode = code; return this; },
            json(data) { resolve({ status: this.statusCode, data }); },
        };
        layer.route.stack[0].handle({ params, body: {}, cookies: {} }, res);
    });
}
const ban = (username) => post('/ban/:username', { username });
const unban = (username) => post('/unban/:username', { username });

(async () => {
    accounts.spammer = { username: 'spammer', token: 'tok', library: {} };

    // A ban marks the account, ends its session, and takes its lists out of Discover.
    let result = await ban('  Spammer ');
    assert.strictEqual(result.status, 200);
    assert.strictEqual(accounts.spammer.banned, true);
    assert.ok(!accounts.spammer.token, 'its session is ended');
    assert.strictEqual(saved.length, 1);
    assert.deepStrictEqual(synced, [['spammer', true]], 'the public lists are projected again, now hidden');

    // Banning twice changes nothing more.
    result = await ban('spammer');
    assert.strictEqual(result.status, 200);

    // A moderator cannot be banned, and nothing is written for the refusal.
    accounts.mod = { username: 'mod', token: 'mtok', library: {} };
    const writes = saved.length;
    result = await ban('mod');
    assert.strictEqual(result.status, 409);
    assert.strictEqual(result.data.code, 'moderator');
    assert.ok(!accounts.mod.banned);
    assert.strictEqual(accounts.mod.token, 'mtok');
    assert.strictEqual(saved.length, writes);

    result = await ban('nobody');
    assert.strictEqual(result.status, 404);

    // A ban is lifted, and the lists come back.
    synced.length = 0;
    result = await unban('spammer');
    assert.strictEqual(result.status, 200);
    assert.ok(!accounts.spammer.banned);
    assert.deepStrictEqual(synced, [['spammer', false]]);
    result = await unban('nobody');
    assert.strictEqual(result.status, 404);

    // Only a moderator can do either.
    caller = { moderator: false };
    accounts.erin = { username: 'erin', library: {} };
    result = await ban('erin');
    assert.strictEqual(result.status, 403);
    assert.ok(!accounts.erin.banned);
    accounts.spammer.banned = true;
    result = await unban('spammer');
    assert.strictEqual(result.status, 403);
    assert.strictEqual(accounts.spammer.banned, true);

    console.log('unit-ban-endpoints OK');
    process.exit(0);
})().catch((error) => { console.error(error); process.exit(1); });
