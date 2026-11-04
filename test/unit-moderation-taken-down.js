/**
 * Unit test: GET /moderation/search-lists?takenDown=1 returns the lists a moderator took down, so
 * one can be lifted. They are private, so they come from the libraries of their owners.
 * Run with: node test/unit-moderation-taken-down.js
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

const owners = [
    {
        username: 'zenpak',
        library: { lists: [{ externalId: 'a1', name: 'PCT 2026', takenDown: true }, { externalId: 'a2', name: 'Winter kit' }] },
    },
    {
        username: 'bob',
        library: { lists: [{ externalId: 'b1', name: 'Weekend (light)', takenDown: true }] },
    },
];
const queries = [];
let publicSearches = 0;
stubServerModule('db.js', {
    users: {
        findMany(query, options) {
            queries.push({ query, options });
            return Promise.resolve(owners);
        },
    },
    publicLists: {
        findSorted() { publicSearches += 1; return Promise.resolve([]); },
    },
});
stubServerModule('auth.js', {
    authenticateModerator(req, res, callback) { return callback(req, res, { username: 'fxbenard' }); },
    authenticateUser() {},
    isModerator() { return true; },
});

const router = require('../server/moderation-endpoints.js');

const layer = router.stack.find((l) => l.route && l.route.path === '/moderation/search-lists' && l.route.methods.get);
assert.ok(layer, 'the route exists');

function search(query) {
    return new Promise((resolve) => {
        const res = {
            statusCode: 200,
            status(code) { this.statusCode = code; return this; },
            json(data) { resolve({ status: this.statusCode, data }); },
        };
        layer.route.stack[0].handle({ query, cookies: {} }, res);
    });
}

(async () => {
    let result = await search({ takenDown: '1' });
    assert.strictEqual(result.status, 200);
    assert.deepStrictEqual(result.data.results.map((r) => r.externalId), ['a1', 'b1'], 'only the lists taken down');
    assert.deepStrictEqual(result.data.results[0], {
        externalId: 'a1', name: 'PCT 2026', ownerUsername: 'zenpak', featured: false, takenDown: true,
    });
    assert.strictEqual(publicSearches, 0, 'the public lists are not searched');
    assert.deepStrictEqual(queries[0].query, { 'library.lists.takenDown': true });

    result = await search({ takenDown: '1', q: 'bob' });
    assert.deepStrictEqual(result.data.results.map((r) => r.externalId), ['b1'], 'by author');
    result = await search({ takenDown: '1', q: 'pct' });
    assert.deepStrictEqual(result.data.results.map((r) => r.externalId), ['a1'], 'by name');
    result = await search({ takenDown: '1', q: '(light' });
    assert.strictEqual(result.status, 200, 'the text is not a pattern');
    assert.deepStrictEqual(result.data.results.map((r) => r.externalId), ['b1']);

    // Without the filter the route keeps searching the public lists.
    await search({ q: 'x' });
    assert.strictEqual(publicSearches, 1);

    console.log('unit-moderation-taken-down OK');
    process.exit(0);
})().catch((error) => { console.error(error); process.exit(1); });
