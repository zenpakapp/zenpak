'use strict';

const { createListVersionsStub, buildOwnerUser, stubServerModule } = require('./fixtures/list-versions-fixtures.js');

const listVersionsDb = createListVersionsStub();
stubServerModule('db.js', { listVersions: listVersionsDb });

let currentUser = null;
stubServerModule('auth.js', { authenticateUser(req, res, cb) { cb(req, res, currentUser); } });

const syncCalls = [];
stubServerModule('public-list-projections.js', {
    syncUserPublicLists: async (user) => { syncCalls.push(user.username); },
});

const router = require('../server/list-version-endpoints.js');

let passed = 0; let failed = 0;
function assert(desc, cond) {
    if (cond) { console.log(`  PASS  ${desc}`); passed++; }
    else { console.error(`  FAIL  ${desc}`); failed++; }
}

function callRoute(method, routePath, req) {
    const layer = router.stack.find((l) => l.route && l.route.path === routePath && l.route.methods[method]);
    if (!layer) throw new Error(`route missing: ${method} ${routePath}`);
    return new Promise((resolve) => {
        const res = {
            statusCode: 200,
            headers: {},
            status(code) { this.statusCode = code; return this; },
            set(key, value) { this.headers[key] = value; return this; },
            json(body) { resolve({ status: this.statusCode, body, headers: this.headers }); },
        };
        layer.route.stack[0].handle(req, res);
    });
}

const PUBLISH = '/api/lists/:externalId/publish';
const STATUS = '/api/lists/:externalId/publish-status';

async function run() {
    console.log('\n--- publish ---');
    currentUser = buildOwnerUser();
    let result = await callRoute('post', PUBLISH, { params: { externalId: 'abc123' }, body: { note: 'hello' } });
    assert('publish returns 200 with v1 created', result.status === 200 && result.body.version === 1 && result.body.created === true);
    assert('a created version triggers a projection sync', syncCalls.length === 1 && syncCalls[0] === 'alice');

    result = await callRoute('post', PUBLISH, { params: { externalId: 'abc123' }, body: {} });
    assert('republishing identical content returns created:false', result.status === 200 && result.body.version === 1 && result.body.created === false);
    assert('a deduped publish does not re-sync projections', syncCalls.length === 1);

    result = await callRoute('post', PUBLISH, { params: { externalId: 'nope' }, body: {} });
    assert('unknown list is 404', result.status === 404);

    currentUser.library.lists[1].externalId = 'priv1';
    result = await callRoute('post', PUBLISH, { params: { externalId: 'priv1' }, body: {} });
    assert('private list is rejected with 400', result.status === 400);

    currentUser = buildOwnerUser({ username: 'mallory' });
    result = await callRoute('post', PUBLISH, { params: { externalId: 'abc123' }, body: {} });
    assert('publishing onto another owner\'s externalId is a 409', result.status === 409);

    console.log('\n--- publish rate limit ---');
    currentUser = buildOwnerUser({ externalId: 'rate1', username: 'ratey' });
    let lastStatus = 0;
    for (let i = 0; i < 30; i++) {
        // eslint-disable-next-line no-await-in-loop
        lastStatus = (await callRoute('post', PUBLISH, { params: { externalId: 'rate1' }, body: {} })).status;
    }
    assert('30 publishes per hour are allowed', lastStatus === 200);
    result = await callRoute('post', PUBLISH, { params: { externalId: 'rate1' }, body: {} });
    assert('the 31st is 429 with Retry-After', result.status === 429 && Number(result.headers['Retry-After']) > 0);

    console.log('\n--- publish-status ---');
    currentUser = buildOwnerUser({ externalId: 'st1', username: 'stat' });
    result = await callRoute('get', STATUS, { params: { externalId: 'st1' } });
    assert('unpublished list reports version 0', result.status === 200 && result.body.latestVersion === 0);
    await callRoute('post', PUBLISH, { params: { externalId: 'st1' }, body: {} });
    result = await callRoute('get', STATUS, { params: { externalId: 'st1' } });
    assert('published list reports v1 clean', result.body.latestVersion === 1 && result.body.hasUnpublishedChanges === false);
    currentUser.library.items[0].weight = 5;
    result = await callRoute('get', STATUS, { params: { externalId: 'st1' } });
    assert('an edit flips hasUnpublishedChanges', result.body.hasUnpublishedChanges === true);
    result = await callRoute('get', STATUS, { params: { externalId: 'missing' } });
    assert('status of an unknown list is 404', result.status === 404);

    console.log(`\n${passed} passed, ${failed} failed`);
    process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => { console.error(err); process.exit(1); });
