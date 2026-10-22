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
let listOwner = null;
stubServerModule('list-versions.js', { getPublishedOwner() { return Promise.resolve(listOwner); } });
const told = [];
let noticeFails = false;
const tell = (name) => (user) => {
    told.push([name, user.username]);
    return noticeFails ? Promise.reject(new Error('mail down')) : Promise.resolve();
};
stubServerModule('moderation-notices.js', {
    noticeAccountBanned: tell('banned'),
    noticeAccountRestored: tell('restored'),
    noticeListUnpublished(owner, list) {
        told.push(['unpublished', `${owner.username}/${list.name}`]);
        return noticeFails ? Promise.reject(new Error('mail down')) : Promise.resolve();
    },
});

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

    assert.deepStrictEqual(told, [['banned', 'spammer']], 'the member is told');

    // Banning twice changes nothing more, and tells nobody twice.
    result = await ban('spammer');
    assert.strictEqual(result.status, 200);
    assert.deepStrictEqual(told, [['banned', 'spammer']], 'no second email');

    // A moderator cannot be banned, and nothing is written for the refusal.
    accounts.mod = { username: 'mod', token: 'mtok', library: {} };
    const writes = saved.length;
    result = await ban('mod');
    assert.strictEqual(result.status, 409);
    assert.strictEqual(result.data.code, 'moderator');
    assert.ok(!accounts.mod.banned);
    assert.strictEqual(accounts.mod.token, 'mtok');
    assert.strictEqual(saved.length, writes);
    assert.strictEqual(told.length, 1, 'a refused ban tells nobody');

    result = await ban('nobody');
    assert.strictEqual(result.status, 404);

    // A ban is lifted, and the lists come back.
    synced.length = 0;
    result = await unban('spammer');
    assert.strictEqual(result.status, 200);
    assert.ok(!accounts.spammer.banned);
    assert.deepStrictEqual(synced, [['spammer', false]]);
    assert.deepStrictEqual(told[told.length - 1], ['restored', 'spammer'], 'the member is told it is lifted');
    result = await unban('spammer');
    assert.strictEqual(result.status, 200);
    assert.strictEqual(told.filter((t) => t[0] === 'restored').length, 1, 'lifting an account that is not banned tells nobody');
    result = await unban('nobody');
    assert.strictEqual(result.status, 404);

    // A mail outage does not stop the ban.
    noticeFails = true;
    accounts.fragile = { username: 'fragile', token: 't', library: {} };
    result = await ban('fragile');
    assert.strictEqual(result.status, 200);
    assert.strictEqual(accounts.fragile.banned, true);
    noticeFails = false;

    // Taking a list down tells its owner once; a list already private tells nobody; a mail outage
    // does not stop it.
    listOwner = {
        username: 'dana', library: { lists: [{ externalId: 'ext1', name: 'Big list', visibility: 'discoverable' }] },
    };
    const before = told.length;
    result = await post('/unpublish/:externalId', { externalId: 'ext1' });
    assert.strictEqual(result.status, 200);
    assert.strictEqual(listOwner.library.lists[0].visibility, 'private');
    assert.deepStrictEqual(told.slice(before), [['unpublished', 'dana/Big list']]);
    result = await post('/unpublish/:externalId', { externalId: 'ext1' });
    assert.strictEqual(result.status, 200);
    assert.strictEqual(told.length, before + 1, 'already private: no second email');
    noticeFails = true;
    listOwner.library.lists[0].visibility = 'unlisted';
    result = await post('/unpublish/:externalId', { externalId: 'ext1' });
    assert.strictEqual(result.status, 200);
    assert.strictEqual(listOwner.library.lists[0].visibility, 'private');
    noticeFails = false;
    listOwner = null;

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
