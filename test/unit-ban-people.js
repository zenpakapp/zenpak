/**
 * Unit test: the People tab (GET /api/community/users) leaves banned accounts out, with or without
 * a search.
 * Run with: node test/unit-ban-people.js
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

const pipelines = [];
stubServerModule('db.js', {
    users: {
        aggregate(pipeline) { pipelines.push(pipeline); return Promise.resolve([]); },
    },
});
stubServerModule('auth.js', {
    authenticateUser() {},
    authenticateModerator() {},
    isModerator() { return false; },
});

const router = require('../server/community-endpoints.js');

const layer = router.stack.find((l) => l.route && l.route.path === '/users' && l.route.methods.get);
assert.ok(layer, 'the route exists');

function people(q) {
    return new Promise((resolve) => {
        const res = {
            status() { return this; },
            json(data) { resolve(data); },
        };
        layer.route.stack[0].handle({ query: q === undefined ? {} : { q }, cookies: {} }, res);
    });
}

(async () => {
    await people();
    await people('zen');
    assert.strictEqual(pipelines.length, 2);
    pipelines.forEach((pipeline, index) => {
        const match = pipeline[0].$match;
        assert.deepStrictEqual(match.banned, { $ne: true }, `${index ? 'search' : 'browse'} leaves banned accounts out`);
    });

    console.log('unit-ban-people OK');
    process.exit(0);
})().catch((error) => { console.error(error); process.exit(1); });
