/**
 * Unit test: the People tab (GET /api/community/users) pages its results. It skips what was already
 * shown, reads one row past the page to know whether more exist, and returns a stable order.
 * Run with: node test/unit-people-pagination.js
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

const PAGE_SIZE = 20;
const pipelines = [];
let rows = [];
stubServerModule('db.js', {
    users: {
        aggregate(pipeline) { pipelines.push(pipeline); return Promise.resolve(rows); },
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

function people(query) {
    return new Promise((resolve) => {
        const res = {
            status() { return this; },
            json(data) { resolve(data); },
        };
        layer.route.stack[0].handle({ query, cookies: {} }, res);
    });
}

function makeRows(count) {
    return Array.from({ length: count }, (_, i) => ({ username: `user${i}`, plan: 'free' }));
}

function stage(pipeline, name) {
    return pipeline.find((s) => s[name] !== undefined);
}

(async () => {
    // A full page plus one row means there is more to load, and the extra row is not returned.
    rows = makeRows(PAGE_SIZE + 1);
    let data = await people({});
    assert.strictEqual(data.users.length, PAGE_SIZE, 'the extra row is not returned');
    assert.strictEqual(data.hasMore, true, 'a row past the page means more results exist');
    assert.strictEqual(stage(pipelines[0], '$limit').$limit, PAGE_SIZE + 1, 'one extra row is read');
    assert.strictEqual(stage(pipelines[0], '$skip'), undefined, 'the first page skips nothing');

    // A short page is the last one.
    rows = makeRows(5);
    data = await people({ q: 'user' });
    assert.strictEqual(data.users.length, 5);
    assert.strictEqual(data.hasMore, false, 'a short page is the last page');

    // The skip parameter moves the window and is sanitized.
    rows = makeRows(3);
    await people({ skip: '40' });
    assert.strictEqual(stage(pipelines[2], '$skip').$skip, 40, 'skip is applied');
    await people({ skip: '-5' });
    assert.strictEqual(stage(pipelines[3], '$skip'), undefined, 'a negative skip is ignored');
    await people({ skip: 'abc' });
    assert.strictEqual(stage(pipelines[4], '$skip'), undefined, 'a non numeric skip is ignored');
    await people({ skip: '999999' });
    assert.ok(stage(pipelines[5], '$skip').$skip <= 1000, 'skip is capped');

    // Both modes sort with a unique tie break so pages never overlap.
    await people({});
    await people({ q: 'zen' });
    [pipelines[6], pipelines[7]].forEach((pipeline, index) => {
        const sort = stage(pipeline, '$sort').$sort;
        assert.strictEqual(sort.username, 1, `${index ? 'search' : 'browse'} breaks ties by username`);
        const stages = pipeline.map((s) => Object.keys(s)[0]);
        assert.ok(stages.indexOf('$sort') < stages.indexOf('$limit'), 'sort comes before limit');
    });

    console.log('unit-people-pagination OK');
    process.exit(0);
})().catch((error) => { console.error(error); process.exit(1); });
