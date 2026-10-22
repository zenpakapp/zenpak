/**
 * Unit test: deleting an account also removes its Discover entries, follows and feed events.
 * Run with: node test/unit-delete-account-cleanup.js
 */

'use strict';

const assert = require('assert');
const { ObjectId } = require('mongodb');
const { stubServerModule } = require('./fixtures/list-versions-fixtures.js');

const calls = [];
const collection = (name) => ({ deleteMany(filter) { calls.push([name, filter]); return Promise.resolve(); } });
const account = { _id: new ObjectId(), username: 'eve' };
stubServerModule('db.js', {
    users: { remove() { calls.push(['users', 'remove']); } },
    publicLists: collection('publicLists'),
    follows: collection('follows'),
    feedEvents: collection('feedEvents'),
});
stubServerModule('auth.js', {
    authenticateUser(req, res, next) { next(req, res, account); },
    verifyPassword() { return Promise.resolve(account); },
    generateSession() {},
});
stubServerModule('list-versions.js', { deleteVersionsForOwner: () => Promise.resolve() });

const router = require('../server/account-endpoints.js');

const layer = router.stack.find((l) => l.route && l.route.path === '/delete-account' && l.route.methods.post);
assert.ok(layer, 'POST /delete-account exists');

new Promise((resolve) => {
    const res = {
        statusCode: 200,
        status(code) { this.statusCode = code; return this; },
        json(data) { resolve({ status: this.statusCode, data }); },
    };
    layer.route.stack[0].handle({ body: { password: 'pw', username: 'eve' }, cookies: {} }, res);
}).then((result) => {
    assert.strictEqual(result.status, 200);
    const byName = Object.fromEntries(calls.filter((c) => c[0] !== 'users'));
    assert.strictEqual(String(byName.publicLists.ownerId), String(account._id), 'Discover entries removed');
    assert.strictEqual(byName.follows.$or.length, 2, 'follows removed on both sides');
    assert.strictEqual(String(byName.feedEvents.userId), String(account._id), 'feed events removed');
    console.log('unit-delete-account-cleanup: ok');
    process.exit(0);
}).catch((err) => { console.error(err); process.exit(1); });
