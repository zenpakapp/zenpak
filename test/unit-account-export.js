/**
 * Unit test: the account export. Every plan gets one JSON file with what the account holds: profile,
 * library, who it follows and who follows it, its notifications, copies and reports. Secrets (password
 * hash, session and reset tokens, Stripe customer) are never in it.
 * Run with: node test/unit-account-export.js
 */

'use strict';

const assert = require('assert');
const { ObjectId } = require('mongodb');
const { stubServerModule } = require('./fixtures/list-versions-fixtures.js');

const me = new ObjectId();
const ann = new ObjectId();
const bob = new ObjectId();
const account = {
    _id: me,
    username: 'eve',
    email: 'eve@example.com',
    emailVerified: true,
    language: 'fr',
    password: 'HASH-MUST-NOT-LEAK',
    token: 'SESSION-MUST-NOT-LEAK',
    resetToken: 'RESET-MUST-NOT-LEAK',
    emailVerifyToken: 'VERIFY-MUST-NOT-LEAK',
    setupToken: 'SETUP-MUST-NOT-LEAK',
    billing: {
        provider: 'stripe', plan: 'supporter', status: 'active', interval: 'year', customerId: 'cus_MUST_NOT_LEAK', subscriptionId: 'sub_MUST_NOT_LEAK',
    },
    notificationPrefs: { follow: true, copy: false },
    library: {
        entitlements: { plan: 'supporter' },
        publicProfile: { displayName: 'Eve', bio: 'Hiker' },
        lists: [{ id: 1, name: 'My list' }],
        items: [{ id: 1, name: 'Tent' }],
    },
};
const users = [{ _id: ann, username: 'ann' }, { _id: bob, username: 'bob' }];

stubServerModule('db.js', {
    users: {
        findMany(query, options) {
            assert.deepStrictEqual(options, { projection: { username: 1 } }, 'only usernames are read for other accounts');
            return Promise.resolve(users.filter((u) => query._id.$in.some((id) => String(id) === String(u._id))));
        },
    },
    follows: {
        findMany(query) {
            return Promise.resolve(query.followerId ? [{ followerId: me, followedId: ann }] : [{ followerId: bob, followedId: me }]);
        },
    },
    notifications: { findMany: () => Promise.resolve([{ type: 'follow', actorUsername: 'bob', createdAt: new Date('2026-10-01') }]) },
    listCopies: { findMany: () => Promise.resolve([{ userId: String(me), externalId: 'abc123', version: 2 }]) },
    reports: { findMany: () => Promise.resolve([{ reporterId: me, targetType: 'list', targetId: 'zzz999', reason: 'spam', status: 'pending', createdAt: new Date('2026-10-02') }]) },
});
stubServerModule('auth.js', {
    authenticateUser(req, res, next) { next(req, res, account); },
    verifyPassword() {},
    generateSession() {},
});
stubServerModule('list-versions.js', { deleteVersionsForOwner: () => Promise.resolve() });
stubServerModule('billing.js', { cancelSubscriptionsForDeletion: () => Promise.resolve(0) });
stubServerModule('avatar-storage.js', { destroyAvatar: () => Promise.resolve(false) });

const router = require('../server/account-endpoints.js');

const layer = router.stack.find((l) => l.route && l.route.path === '/api/account/export' && l.route.methods.get);
assert.ok(layer, 'GET /api/account/export exists');

new Promise((resolve) => {
    const headers = {};
    const res = {
        statusCode: 200,
        setHeader(name, value) { headers[name] = value; },
        status(code) { this.statusCode = code; return this; },
        send(text) { resolve({ status: this.statusCode, headers, text }); },
        json(data) { resolve({ status: this.statusCode, headers, text: JSON.stringify(data) }); },
    };
    layer.route.stack[0].handle({ cookies: {} }, res);
}).then((result) => {
    assert.strictEqual(result.status, 200);
    assert.ok(result.headers['Content-Disposition'].startsWith('attachment; filename=zenpak-data-eve'), 'downloaded as a file');
    assert.strictEqual(result.headers['Cache-Control'], 'no-store');

    const body = JSON.parse(result.text);
    assert.strictEqual(body.account.username, 'eve');
    assert.strictEqual(body.account.email, 'eve@example.com');
    assert.strictEqual(body.account.plan, 'supporter');
    assert.strictEqual(body.account.billing.status, 'active');
    assert.strictEqual(body.publicProfile.bio, 'Hiker');
    assert.strictEqual(body.library.lists[0].name, 'My list');
    assert.strictEqual(body.library.publicProfile, undefined, 'the profile is not repeated inside the library');
    assert.deepStrictEqual(body.following, ['ann']);
    assert.deepStrictEqual(body.followers, ['bob']);
    assert.strictEqual(body.notifications[0].actorUsername, 'bob');
    assert.deepStrictEqual(body.listCopies, [{ externalId: 'abc123', version: 2 }]);
    assert.strictEqual(body.reportsFiled[0].reason, 'spam');

    // No secret, whatever the account holds.
    ['MUST-NOT-LEAK', 'MUST_NOT_LEAK'].forEach((marker) => {
        assert.ok(!result.text.includes(marker), `the export holds no secret (${marker})`);
    });
    console.log('unit-account-export: ok');
    process.exit(0);
}).catch((err) => { console.error(err); process.exit(1); });
