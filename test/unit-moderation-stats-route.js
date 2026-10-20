/**
 * Unit test: GET /moderation/stats is for moderators only and returns the panel numbers.
 * Run with: node test/unit-moderation-stats-route.js
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

const numbers = { users: { total: 3 }, plans: {}, lists: {}, activity: {} };
let asked = 0;
let moderator = true;

stubServerModule('db.js', { users: {} });
stubServerModule('moderation-stats.js', {
    collectStats: async () => { asked += 1; return numbers; },
});
stubServerModule('auth.js', {
    // A visitor who is not a moderator never reaches the handler.
    authenticateModerator(req, res, callback) { return moderator ? callback(req, res, { username: 'fxbenard' }) : undefined; },
    authenticateUser() {},
    isModerator() { return true; },
});

const router = require('../server/moderation-endpoints.js');

const layer = router.stack.find((l) => l.route && l.route.path === '/moderation/stats' && l.route.methods.get);
assert.ok(layer, 'the route exists');

(async () => {
    let body = null;
    await new Promise((resolve) => {
        layer.route.stack[0].handle({ query: {}, cookies: {} }, { json(data) { body = data; resolve(); }, status() { return this; } });
    });
    assert.deepStrictEqual(body, numbers);
    assert.strictEqual(asked, 1);

    // Not a moderator: nothing is counted.
    moderator = false;
    layer.route.stack[0].handle({ query: {}, cookies: {} }, { json() { assert.fail('should not answer'); }, status() { return this; } });
    await new Promise((resolve) => { setTimeout(resolve, 20); });
    assert.strictEqual(asked, 1, 'a visitor does not trigger the count');

    console.log('ok');
})();
