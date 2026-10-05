'use strict';

const { ObjectId } = require('mongodb');
const {
    createListVersionsStub, createListCopiesStub, createUsersStub, buildOwnerUser, stubServerModule,
} = require('./fixtures/list-versions-fixtures.js');

const alice = buildOwnerUser({ externalId: 'abc123', username: 'alice' });
const bob = {
    _id: new ObjectId(),
    username: 'bob',
    library: {
        lists: [
            { id: 1, name: 'My PCT', forkedFrom: { externalId: 'abc123', version: 1, ownerId: String(alice._id) } },
            { id: 2, name: 'Legacy', forkedFrom: { externalId: 'abc123', ownerUsername: 'alice' } },
            { id: 3, name: 'Mine' },
        ],
    },
};

const listVersionsDb = createListVersionsStub();
const usersDb = createUsersStub([alice, bob]);
const listCopiesDb = createListCopiesStub();
listCopiesDb.rows.push({ userId: String(bob._id), externalId: 'abc123', version: 1 });
stubServerModule('db.js', { listVersions: listVersionsDb, users: usersDb, listCopies: listCopiesDb });
let currentUser = bob;
stubServerModule('auth.js', { authenticateUser(req, res, cb) { cb(req, res, currentUser); } });
stubServerModule('public-list-projections.js', { syncUserPublicLists: async () => {} });

const { buildFrozenLibrary, hashFrozenLibrary, computeTotals } = require('../server/list-versions.js');
const { loadForkPayloads } = require('../server/fork-diff.js');
const router = require('../server/list-version-endpoints.js');

let passed = 0; let failed = 0;
function assert(desc, cond) {
    if (cond) { console.log(`  PASS  ${desc}`); passed++; }
    else { console.error(`  FAIL  ${desc}`); failed++; }
}

function versionRow(version, library) {
    return {
        externalId: 'abc123', version, ownerId: alice._id, publishedAt: new Date(), note: '', contentHash: hashFrozenLibrary(library), library, totals: computeTotals(library),
    };
}

// v1 = fixture as-is, v2 = Tent lighter.
const v1 = buildFrozenLibrary(alice.library, 'abc123');
const live = JSON.parse(JSON.stringify(alice.library));
live.items.find((item) => item.id === 11).weight = 850000;
alice.library = live;
const v2 = buildFrozenLibrary(alice.library, 'abc123');
listVersionsDb.rows.push(versionRow(1, v1), versionRow(2, v2));

function callRoute(method, routePath, req) {
    const layer = router.stack.find((l) => l.route && l.route.path === routePath && l.route.methods[method]);
    if (!layer) throw new Error(`route missing: ${method} ${routePath}`);
    return new Promise((resolve) => {
        const res = {
            statusCode: 200,
            headers: {},
            set(name, value) { this.headers[name] = value; return this; },
            status(code) { this.statusCode = code; return this; },
            json(body) { resolve({ status: this.statusCode, body, headers: this.headers }); },
        };
        layer.route.stack[0].handle(req, res);
    });
}

async function run() {
    console.log('\n--- loadForkPayloads ---');
    const loaded = await loadForkPayloads(bob, 1);
    assert('returns both payloads for a tracked fork', Boolean(loaded) && loaded.fromVersion === 1 && loaded.toVersion === 2);
    assert('base payload has the v1 tent weight', Boolean(loaded) && loaded.basePayload.categories.some((c) => c.items.some((i) => i.id === 11 && i.weight === 900000)));
    assert('latest payload has the v2 tent weight', Boolean(loaded) && loaded.latestPayload.categories.some((c) => c.items.some((i) => i.id === 11 && i.weight === 850000)));
    assert('legacy fork gets null', (await loadForkPayloads(bob, 2)) === null);
    assert('non-fork gets null', (await loadForkPayloads(bob, 3)) === null);

    console.log('\n--- GET /api/lists/fork-apply/:listId ---');
    const ok = await callRoute('get', '/api/lists/fork-apply/:listId', { params: { listId: '1' } });
    assert('200 with base and latest', ok.status === 200 && ok.body.toVersion === 2 && Boolean(ok.body.base) && Boolean(ok.body.latest) && ok.body.sourceExternalId === 'abc123');
    const missing = await callRoute('get', '/api/lists/fork-apply/:listId', { params: { listId: '2' } });
    assert('404 for a legacy fork', missing.status === 404);

    console.log('\n--- POST /api/lists/fork-apply/:listId/record ---');
    const post = (listId, body) => callRoute('post', '/api/lists/fork-apply/:listId/record', { params: { listId }, body });
    const rowsBefore = listCopiesDb.rows.length;
    const recorded = await post('1', { version: 2 });
    assert('records the latest version', recorded.status === 200 && recorded.body.recorded === true && recorded.body.version === 2);
    assert('a registry row exists for bob v2', listCopiesDb.rows.some((r) => r.userId === String(bob._id) && r.externalId === 'abc123' && r.version === 2));
    await post('1', { version: 2 });
    assert('recording twice is idempotent', listCopiesDb.rows.length === rowsBefore + 1);
    assert('an older version is refused (409)', (await post('1', { version: 1 })).status === 409);
    assert('a future version is refused (409)', (await post('1', { version: 9 })).status === 409);
    assert('a non-integer version is refused (400)', (await post('1', { version: '2' })).status === 400);
    assert('a missing body is refused (400)', (await post('1', undefined)).status === 400);
    assert('a legacy fork gets 404', (await post('2', { version: 2 })).status === 404);
    assert('a non-fork gets 404', (await post('3', { version: 2 })).status === 404);
    assert('refused calls wrote nothing', listCopiesDb.rows.length === rowsBefore + 1);
    const eve = { _id: new ObjectId(), username: 'eve', library: { lists: [{ id: 1, name: 'Forged', forkedFrom: { externalId: 'abc123', version: 1, ownerId: String(alice._id) } }] } };
    currentUser = eve;
    assert('a user who never copied v1 cannot register v2', (await post('1', { version: 2 })).status === 404);
    currentUser = bob;
    let limited = null;
    for (let i = 0; i < 31 && !(limited && limited.status === 429); i++) limited = await post('1', { version: 2 });
    assert('rate limited after 30 calls an hour', limited && limited.status === 429 && Boolean(limited.headers['Retry-After']));

    console.log(`\n${passed} passed, ${failed} failed`);
    process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => { console.error(err); process.exit(1); });
