/**
 * Unit test: the People search (GET /api/community/users?q=) sorts exact matches first, then names
 * that start with the query, then the rest, each group by most recent public list.
 * Run with: node test/unit-people-search-sort.js
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
        layer.route.stack[0].handle({ query: { q }, cookies: {} }, res);
    });
}

(async () => {
    await people('zen.pak');
    const pipeline = pipelines[0];
    const stages = pipeline.map((stage) => Object.keys(stage)[0]);

    const sortIndex = stages.indexOf('$sort');
    assert.ok(sortIndex > 0, 'the search pipeline sorts');
    assert.ok(sortIndex < stages.indexOf('$limit'), 'sorting happens before the limit');
    assert.deepStrictEqual(pipeline[sortIndex].$sort, { _rank: 1, _latestList: -1, username: 1 }, 'relevance first, then latest public list, then username');

    const fields = Object.assign({}, ...pipeline.filter((stage) => stage.$addFields).map((stage) => stage.$addFields));
    assert.ok(fields._rank, 'a relevance rank is computed');
    assert.ok(fields._latestList, 'the latest public list date is computed');

    const rank = JSON.stringify(fields._rank);
    assert.ok(rank.includes('"^zen\\\\.pak$"'), 'exact match is ranked with an anchored escaped regex');
    assert.ok(rank.includes('"^zen\\\\.pak"'), 'prefix match is ranked with an anchored escaped regex');

    console.log('unit-people-search-sort OK');
    process.exit(0);
})().catch((error) => { console.error(error); process.exit(1); });
