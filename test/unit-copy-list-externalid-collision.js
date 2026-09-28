// test/unit-copy-list-externalid-collision.js
'use strict';

const { ObjectId } = require('mongodb');
const {
    createListVersionsStub, createUsersStub, buildOwnerUser, stubServerModule,
} = require('./fixtures/list-versions-fixtures.js');

const listVersionsDb = createListVersionsStub();
const owner = buildOwnerUser({ externalId: 'dup1' });
const impostor = buildOwnerUser({ externalId: 'dup1', username: 'mallory' });
const copier = { _id: new ObjectId(), username: 'bob', library: { lists: [] } };
const users = [impostor, owner, copier]; // impostor first: a non-unique externalId query would return it
stubServerModule('db.js', { listVersions: listVersionsDb, users: createUsersStub(users) });
stubServerModule('auth.js', { authenticateUser(req, res, cb) { cb(req, res, copier); } });
stubServerModule('feed-events.js', { getFeedForUser: async () => ({ events: [], nextCursor: null }) });

const { publishVersion } = require('../server/list-versions.js');
const router = require('../server/community-endpoints.js');

let passed = 0; let failed = 0;
function assert(desc, cond) {
    if (cond) { console.log(`  PASS  ${desc}`); passed++; }
    else { console.error(`  FAIL  ${desc}`); failed++; }
}

function copy(externalId) {
    const layer = router.stack.find((l) => l.route && l.route.path === '/copy-list/:externalId' && l.route.methods.post);
    return new Promise((resolve) => {
        const res = {
            statusCode: 200,
            status(code) { this.statusCode = code; return this; },
            set() { return this; },
            json(body) { resolve({ status: this.statusCode, body }); },
        };
        layer.route.stack[0].handle({ params: { externalId }, body: {}, ip: '127.0.0.1' }, res);
    });
}

async function run() {
    await publishVersion(owner, 'dup1', '');

    let result = await copy('dup1');
    assert('the real publisher\'s list is copied despite the impostor', result.status === 200 && result.body.forkedFrom.ownerUsername === 'alice');
    assert('the copy carries the published content', result.body.listName === 'PCT' && result.body.categories.flatMap((c) => c.categoryItems.map((i) => i.name)).includes('Tent'));

    impostor.library.lists[0].externalId = 'claim-only';
    result = await copy('claim-only');
    assert('a claimed but never-published externalId cannot be copied', result.status === 404);

    console.log(`\n${passed} passed, ${failed} failed`);
    process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => { console.error(err); process.exit(1); });
