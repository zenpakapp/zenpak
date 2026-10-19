/**
 * Unit test: GET /api/notifications leaves out what a banned account did, and does not count it as
 * unread. The notifications stay stored, so they come back if the account is reinstated.
 * Run with: node test/unit-notifications-banned.js
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
const { ObjectId } = require('mongodb');
const { stubServerModule } = require('./fixtures/list-versions-fixtures.js');

const me = { _id: new ObjectId(), username: 'alice' };
const note = (actorUsername, minutesAgo, read = false) => ({
    _id: new ObjectId(),
    userId: me._id,
    type: 'follow',
    actorUsername,
    read,
    createdAt: new Date(Date.now() - minutesAgo * 60000),
});
const store = [note('friend', 5), note('spammer', 3), note('spammer', 2, true), note('other', 1)];
const bannedNames = new Set(['spammer']);

stubServerModule('db.js', {
    notifications: { findMany() { return Promise.resolve(store); } },
    users: {
        findMany(query) {
            const wanted = query.username.$in;
            return Promise.resolve(wanted.filter((name) => bannedNames.has(name)).map((username) => ({ username, banned: true })));
        },
    },
});
stubServerModule('auth.js', {
    authenticateUser(req, res, callback) { return callback(req, res, me); },
});

const router = require('../server/notification-endpoints.js');

const layer = router.stack.find((l) => l.route && l.route.path === '/' && l.route.methods.get);
assert.ok(layer, 'the route exists');

function list() {
    return new Promise((resolve) => {
        const res = { status() { return this; }, json(data) { resolve(data); } };
        layer.route.stack[0].handle({ cookies: {}, query: {} }, res);
    });
}

(async () => {
    let data = await list();
    assert.deepStrictEqual(data.notifications.map((n) => n.actorUsername), ['other', 'friend'], 'a banned account\'s alerts are left out');
    assert.strictEqual(data.unreadCount, 2, 'and not counted as unread');

    // Reinstated: they are back.
    bannedNames.clear();
    data = await list();
    assert.strictEqual(data.notifications.length, 4);
    assert.strictEqual(data.unreadCount, 3);

    console.log('unit-notifications-banned OK');
    process.exit(0);
})().catch((error) => { console.error(error); process.exit(1); });
