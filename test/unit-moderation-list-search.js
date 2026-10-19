/**
 * Unit test: GET /moderation/search-lists lets a moderator find a published list by its name or
 * by its author, to feature or unpublish it without waiting for a report.
 * Run with: node test/unit-moderation-list-search.js
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

const lists = [
    {
        externalId: 'a1', name: 'PCT 2026 summer', ownerUsername: 'zenpak', featured: true, updatedAt: new Date('2026-10-02'),
    },
    {
        externalId: 'b2', name: 'Weekend (light)', ownerUsername: 'bob', featured: false, updatedAt: new Date('2026-10-03'),
    },
    {
        externalId: 'c3', name: 'Winter kit', ownerUsername: 'zenpak', featured: false, updatedAt: new Date('2026-10-01'),
    },
];
const calls = [];
// A stand-in for the collection: it applies the `$or` of regular expressions the route builds.
stubServerModule('db.js', {
    users: {},
    publicLists: {
        findSorted(query, sort, limit) {
            calls.push({ query, sort, limit });
            const matches = (list) => !query.$or || query.$or.some((clause) => Object.entries(clause)
                .every(([field, pattern]) => pattern.test(list[field])));
            return Promise.resolve(lists.filter(matches).sort((a, b) => b.updatedAt - a.updatedAt).slice(0, limit));
        },
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

function search(q) {
    return new Promise((resolve) => {
        const res = {
            statusCode: 200,
            status(code) { this.statusCode = code; return this; },
            json(data) { resolve({ status: this.statusCode, data }); },
        };
        layer.route.stack[0].handle({ query: q === undefined ? {} : { q }, cookies: {} }, res);
    });
}

(async () => {
    // By list name, whatever the case.
    let result = await search('PCT');
    assert.strictEqual(result.status, 200);
    assert.deepStrictEqual(result.data.results.map((r) => r.externalId), ['a1']);
    assert.deepStrictEqual(result.data.results[0], {
        externalId: 'a1', name: 'PCT 2026 summer', ownerUsername: 'zenpak', featured: true,
    });
    result = await search('winter');
    assert.deepStrictEqual(result.data.results.map((r) => r.externalId), ['c3']);

    // By author: all of their lists, newest first.
    result = await search('zenpak');
    assert.deepStrictEqual(result.data.results.map((r) => r.externalId), ['a1', 'c3']);

    // Nothing typed: the newest lists, so the moderator can browse.
    result = await search('');
    assert.deepStrictEqual(result.data.results.map((r) => r.externalId), ['b2', 'a1', 'c3']);
    result = await search();
    assert.strictEqual(result.data.results.length, 3);

    // What the user typed is text, not a pattern: a bracket must not break the search.
    result = await search('(light');
    assert.strictEqual(result.status, 200);
    assert.deepStrictEqual(result.data.results.map((r) => r.externalId), ['b2']);

    // The result list stays short.
    assert.ok(calls.every((call) => call.limit <= 30), 'a bounded result list');

    console.log('unit-moderation-list-search OK');
    process.exit(0);
})().catch((error) => { console.error(error); process.exit(1); });
