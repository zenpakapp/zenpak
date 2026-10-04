'use strict';

const { ObjectId } = require('mongodb');
const {
    createListVersionsStub, createUsersStub, buildOwnerUser, stubServerModule,
} = require('./fixtures/list-versions-fixtures.js');

const alice = buildOwnerUser({ externalId: 'src1', username: 'alice' });
const carol = buildOwnerUser({ externalId: 'src2', username: 'carol' });
carol.library.lists[0].visibility = 'private';
const bob = {
    _id: new ObjectId(),
    username: 'bob',
    library: {
        lists: [
            { id: 1, name: 'Behind', forkedFrom: { externalId: 'src1', version: 1, ownerId: String(alice._id) } },
            { id: 2, name: 'Current', forkedFrom: { externalId: 'src1', version: 2, ownerId: String(alice._id) } },
            { id: 3, name: 'Legacy', forkedFrom: { externalId: 'src1', ownerUsername: 'alice' } },
            { id: 4, name: 'String version', forkedFrom: { externalId: 'src1', version: '1', ownerId: String(alice._id) } },
            { id: 5, name: 'Unpublished source', forkedFrom: { externalId: 'never', version: 1, ownerId: String(alice._id) } },
            { id: 6, name: 'Private source', forkedFrom: { externalId: 'src2', version: 1, ownerId: String(carol._id) } },
            { id: 7, name: 'Not a fork', forkedFrom: null },
            { id: 8, name: 'Reused id', forkedFrom: { externalId: 'src1', version: 1, ownerId: String(new ObjectId()) } },
            { id: 9, name: 'No owner recorded', forkedFrom: { externalId: 'src1', version: 1 } },
        ],
    },
};

const listVersionsDb = createListVersionsStub();
listVersionsDb.rows.push(
    { externalId: 'src1', version: 1, ownerId: alice._id },
    { externalId: 'src1', version: 2, ownerId: alice._id },
    { externalId: 'src2', version: 1, ownerId: carol._id },
    { externalId: 'src2', version: 2, ownerId: carol._id },
);
listVersionsDb.rows.push({ externalId: 'badowner', version: 2, ownerId: 'not-an-object-id' });
const usersDb = createUsersStub([alice, carol, bob]);
stubServerModule('db.js', { listVersions: listVersionsDb, users: usersDb });

const currentUser = bob;
stubServerModule('auth.js', { authenticateUser(req, res, cb) { cb(req, res, currentUser); } });
stubServerModule('public-list-projections.js', { syncUserPublicLists: async () => {} });

const { getForkUpdates } = require('../server/list-versions.js');
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
            status(code) { this.statusCode = code; return this; },
            json(body) { resolve({ status: this.statusCode, body }); },
        };
        layer.route.stack[0].handle(req, res);
    });
}

async function run() {
    console.log('\n--- getForkUpdates ---');
    const updates = await getForkUpdates(bob);
    const byList = (id) => updates.find((u) => u.listId === id);
    assert('a fork behind its source gets an update', byList(1) && byList(1).latestVersion === 2 && byList(1).forkedVersion === 1 && byList(1).sourceExternalId === 'src1');
    assert('a fork on the latest version gets none', !byList(2));
    assert('a legacy fork without version gets none', !byList(3));
    assert('a non-integer version is treated as legacy', !byList(4));
    assert('a source with no published version gets none', !byList(5));
    assert('a source that is no longer public gets none', !byList(6));
    assert('a list that is not a fork gets none', !byList(7));
    assert('an externalId now published by another account than the one copied gets none', !byList(8));
    assert('a fork that recorded no source owner gets none', !byList(9));
    assert('exactly one update overall', updates.length === 1);

    alice.library.lists[0].visibility = 'private';
    assert('unsharing the source removes the update', (await getForkUpdates(bob)).length === 0);
    alice.library.lists[0].visibility = 'discoverable';
    alice.library.lists[0].externalId = 'renamed';
    assert('a source list gone from its owner library gives none', (await getForkUpdates(bob)).length === 0);
    alice.library.lists[0].externalId = 'src1';

    const lastFind = usersDb.findManyCalls[usersDb.findManyCalls.length - 1];
    const projection = lastFind && lastFind.options && lastFind.options.projection;
    assert('source owners are loaded with a lists-only projection', Boolean(projection) && projection['library.lists'] === 1 && Object.keys(projection).length === 1);

    const dave = { _id: new ObjectId(), library: { lists: [{ id: 1, forkedFrom: { externalId: 'badowner', version: 1 } }] } };
    let badOwnerUpdates = null;
    try { badOwnerUpdates = await getForkUpdates(dave); } catch (err) { badOwnerUpdates = err; }
    assert('a malformed source ownerId is skipped instead of throwing', Array.isArray(badOwnerUpdates) && badOwnerUpdates.length === 0);

    assert('a user with no lists gets an empty array', (await getForkUpdates({ _id: new ObjectId(), library: {} })).length === 0);

    console.log('\n--- GET /api/lists/fork-updates ---');
    const result = await callRoute('get', '/api/lists/fork-updates', { params: {} });
    assert('route returns 200 with the updates', result.status === 200 && Array.isArray(result.body.updates) && result.body.updates.length === 1 && result.body.updates[0].listId === 1);

    console.log(`\n${passed} passed, ${failed} failed`);
    process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => { console.error(err); process.exit(1); });
