/**
 * Unit test: a banned account disappears from the people who follow it. Its events leave their
 * feed, it cannot be followed, and it shows as not followed. The follows themselves stay stored,
 * so they come back if the account is reinstated.
 * Run with: node test/unit-ban-feed.js
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

const viewer = { _id: new ObjectId(), username: 'viewer', library: {} };
const friend = {
    _id: new ObjectId(), username: 'friend', library: { lists: [{ id: 1, name: 'Friend list' }] },
};
const spammer = {
    _id: new ObjectId(), username: 'spammer', banned: true, library: { lists: [{ id: 2, name: 'Spam list' }] },
};
const users = [viewer, friend, spammer];

const follows = [];
const notifications = [];
const event = (user, listId) => ({
    _id: new ObjectId(), type: 'list-published', createdAt: new Date(), userId: user._id, listId: String(listId),
});

stubServerModule('db.js', {
    users: {
        findOne(query) { return Promise.resolve(users.find((u) => u.username === query.username) || null); },
        findMany(query) {
            const ids = query._id.$in.map(String);
            return Promise.resolve(users.filter((u) => ids.includes(String(u._id))));
        },
    },
    follows: {
        findMany() { return Promise.resolve([]); },
        findOne() { return Promise.resolve(null); },
        save(doc) { follows.push(doc); return Promise.resolve(doc); },
    },
});
stubServerModule('auth.js', {
    authenticateUser(req, res, callback) { return callback(req, res, viewer); },
    authenticateModerator() {},
    isModerator() { return false; },
});
let feedEvents = [];
stubServerModule('feed-events.js', {
    getFeedForUser() { return Promise.resolve({ events: feedEvents, nextCursor: null }); },
});
stubServerModule('notifications.js', {
    createNotification(notification) { notifications.push(notification); return Promise.resolve(); },
});

const router = require('../server/community-endpoints.js');

function call(method, path, { params = {}, query = {}, body = {} } = {}) {
    const layer = router.stack.find((l) => l.route && l.route.path === path && l.route.methods[method]);
    assert.ok(layer, `${method} ${path} exists`);
    return new Promise((resolve) => {
        const res = {
            statusCode: 200,
            status(code) { this.statusCode = code; return this; },
            json(data) { resolve({ status: this.statusCode, data }); },
        };
        layer.route.stack[0].handle({
            params, query, body, cookies: {},
        }, res);
    });
}

(async () => {
    // The feed keeps what friends publish and drops what a banned account published.
    feedEvents = [event(spammer, 2), event(friend, 1), event(spammer, 2)];
    let result = await call('get', '/feed');
    assert.strictEqual(result.status, 200);
    assert.deepStrictEqual(result.data.events.map((e) => e.author), ['friend']);

    feedEvents = [event(spammer, 2)];
    result = await call('get', '/feed');
    assert.deepStrictEqual(result.data.events, [], 'a feed with only banned authors is empty');

    // A banned account cannot be followed: nothing is stored and nobody is notified.
    result = await call('post', '/follow/:username', { params: { username: 'spammer' } });
    assert.strictEqual(result.status, 404);
    assert.strictEqual(follows.length, 0);
    assert.strictEqual(notifications.length, 0);

    // A friend still can be.
    result = await call('post', '/follow/:username', { params: { username: 'friend' } });
    assert.strictEqual(result.status, 200);
    assert.strictEqual(follows.length, 1);

    // It shows as not followed.
    result = await call('get', '/follow-status/:username', { params: { username: 'spammer' } });
    assert.deepStrictEqual(result.data, { following: false, mode: null });

    console.log('unit-ban-feed OK');
    process.exit(0);
})().catch((error) => { console.error(error); process.exit(1); });
