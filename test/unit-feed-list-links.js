/**
 * Unit test: feed events carry the public id of their list (listExternalId) only while the list is
 * still public, so the client can link to /p/<id> without producing a dead link.
 * Run with: node test/unit-feed-list-links.js
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
    _id: new ObjectId(),
    username: 'friend',
    library: {
        lists: [
            {
                id: 1, name: 'Discoverable', visibility: 'discoverable', externalId: 'ext-discoverable',
            },
            {
                id: 2, name: 'Indexable', visibility: 'indexable', externalId: 'ext-indexable',
            },
            {
                id: 3, name: 'Shareable', visibility: 'shareable', externalId: 'ext-shareable',
            },
            {
                id: 4, name: 'Private', visibility: 'private', externalId: 'ext-private',
            },
            { id: 5, name: 'No public id', visibility: 'discoverable' },
        ],
    },
};
const users = [viewer, friend];

const event = (listId) => ({
    _id: new ObjectId(), type: 'list-published', createdAt: new Date(), userId: friend._id, listId: String(listId),
});

stubServerModule('db.js', {
    users: {
        findMany(query) {
            const ids = query._id.$in.map(String);
            return Promise.resolve(users.filter((u) => ids.includes(String(u._id))));
        },
    },
    follows: {
        findMany() { return Promise.resolve([]); },
    },
});
stubServerModule('auth.js', {
    authenticateUser(req, res, callback) { return callback(req, res, viewer); },
    authenticateModerator() {},
    isModerator() { return false; },
});
stubServerModule('feed-events.js', {
    getFeedForUser() {
        return Promise.resolve({ events: [1, 2, 3, 4, 5, 99].map(event), nextCursor: null });
    },
});

const router = require('../server/community-endpoints.js');

const layer = router.stack.find((l) => l.route && l.route.path === '/feed' && l.route.methods.get);
assert.ok(layer, 'the route exists');

new Promise((resolve) => {
    const res = {
        status() { return this; },
        json(data) { resolve(data); },
    };
    layer.route.stack[0].handle({ query: {}, cookies: {} }, res);
}).then((data) => {
    const byName = Object.fromEntries(data.events.map((e) => [e.listName || 'gone', e.listExternalId]));

    assert.strictEqual(byName.Discoverable, 'ext-discoverable', 'a discoverable list is linkable');
    assert.strictEqual(byName.Indexable, 'ext-indexable', 'an indexable list is linkable');
    assert.strictEqual(byName.Shareable, '', 'a shareable list is not listed in the community, so no link');
    assert.strictEqual(byName.Private, undefined, 'a list made private since gives no name to followers');
    assert.strictEqual(byName['No public id'], '', 'a list without a public id gets no link');
    assert.strictEqual(byName.gone, '', 'a deleted list gets no link');

    console.log('unit-feed-list-links OK');
    process.exit(0);
}).catch((error) => { console.error(error); process.exit(1); });
