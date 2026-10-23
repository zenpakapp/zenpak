/**
 * Unit test: a moderator take-down, feature or lift writes the library only if nobody saved since
 * it was read, and moves the sync token, so a /saveLibrary running at the same time cannot undo it
 * (and is itself refused). Ban and unban write only their own fields.
 * Run with: node test/unit-moderation-library-race.js
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

const writes = [];
let matched = 1;
const accounts = {};
stubServerModule('db.js', {
    users: {
        findOne(query) { return Promise.resolve(accounts[query.username] || null); },
        updateOne(filter, update) { writes.push([filter, update]); return Promise.resolve({ matchedCount: matched }); },
    },
    reports: {},
});
stubServerModule('auth.js', {
    authenticateUser() {},
    authenticateModerator(req, res, callback) { return callback(req, res, { username: 'mod' }); },
    isModerator(username) { return username === 'mod'; },
});
const synced = [];
stubServerModule('public-list-projections.js', {
    syncUserPublicLists(user) { synced.push(user.username); return Promise.resolve(); },
});
let listOwner = null;
stubServerModule('list-versions.js', { getPublishedOwner() { return Promise.resolve(listOwner); } });
const told = [];
stubServerModule('moderation-notices.js', {
    noticeAccountBanned() { return Promise.resolve(); },
    noticeAccountRestored() { return Promise.resolve(); },
    noticeListUnpublished(owner, list) { told.push(list.name); return Promise.resolve(); },
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

function freshOwner() {
    return {
        _id: 'owner1',
        username: 'dana',
        syncToken: 7,
        library: { lists: [{ id: 1, name: 'Big list', externalId: 'ext1', visibility: 'discoverable' }] },
    };
}

(async () => {
    // Take-down: conditional on the sync token read with the owner, which it also moves.
    listOwner = freshOwner();
    let result = await post('/unpublish/:externalId', { externalId: 'ext1' });
    assert.strictEqual(result.status, 200);
    assert.deepStrictEqual(writes[0][0], { _id: 'owner1', syncToken: 7 }, 'the write is conditional on the sync token that was read');
    assert.deepStrictEqual(writes[0][1].$inc, { syncToken: 1 }, 'the sync token moves, so an older /saveLibrary is refused');
    assert.strictEqual(writes[0][1].$set.library.lists[0].takenDown, true);
    assert.deepStrictEqual(Object.keys(writes[0][1].$set), ['library'], 'only the library is written, not the whole account');

    // The owner saved in between: nothing is told, nothing is projected, the moderator is told to retry.
    writes.length = 0;
    told.length = 0;
    synced.length = 0;
    matched = 0;
    listOwner = freshOwner();
    result = await post('/unpublish/:externalId', { externalId: 'ext1' });
    assert.strictEqual(result.status, 409);
    assert.strictEqual(result.data.code, 'conflict');
    assert.deepStrictEqual(told, [], 'the owner is not told about a take-down that did not happen');
    assert.deepStrictEqual(synced, [], 'nothing is projected for a write that did not happen');

    listOwner = freshOwner();
    result = await post('/feature/:externalId', { externalId: 'ext1' });
    assert.strictEqual(result.status, 409, 'feature refuses a lost race');

    listOwner = freshOwner();
    listOwner.library.lists[0].takenDown = true;
    result = await post('/lift/:externalId', { externalId: 'ext1' });
    assert.strictEqual(result.status, 409, 'lift refuses a lost race');

    // Ban and unban write their own fields only: they cannot overwrite a library save.
    matched = 1;
    writes.length = 0;
    accounts.spammer = { _id: 'u2', username: 'spammer', token: 'tok', password: 'hash', library: {} };
    result = await post('/ban/:username', { username: 'spammer' });
    assert.strictEqual(result.status, 200);
    assert.deepStrictEqual(writes[0], [{ _id: 'u2' }, { $set: { banned: true }, $unset: { token: '' } }]);
    result = await post('/unban/:username', { username: 'spammer' });
    assert.deepStrictEqual(writes[1], [{ _id: 'u2' }, { $set: { banned: false } }]);

    console.log('unit-moderation-library-race OK');
})().catch((error) => { console.error(error); process.exit(1); });
