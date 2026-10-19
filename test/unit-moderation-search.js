/**
 * Unit test: GET /moderation/search lists an account once, even when both its name and its
 * e-mail match the query.
 * Run with: node test/unit-moderation-search.js
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

const zen = { username: 'zenpak', email: 'zen@example.com', library: {} };
const other = { username: 'bob', email: 'zen.bob@example.com', library: {} };
stubServerModule('db.js', {
    users: {
        find(query, callback) {
            callback(null, query.username ? [zen] : [zen, other]);
        },
    },
});
stubServerModule('auth.js', {
    authenticateModerator(req, res, callback) { return callback(req, res, { username: 'fxbenard' }); },
    authenticateUser() {},
    isModerator() { return true; },
});

const router = require('../server/moderation-endpoints.js');

const layer = router.stack.find((l) => l.route && l.route.path === '/moderation/search' && l.route.methods.get);
assert.ok(layer, 'the route exists');

const res = {
    status() { return this; },
    json(data) {
        assert.deepStrictEqual(data.results.map((r) => r.username), ['zenpak', 'bob']);
        console.log('unit-moderation-search OK');
    },
};
layer.route.stack[0].handle({ query: { q: 'zen' }, cookies: {} }, res);
