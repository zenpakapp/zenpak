'use strict';

const {
    createListVersionsStub, createUsersStub, buildOwnerUser, stubServerModule,
} = require('./fixtures/list-versions-fixtures.js');

const listVersionsDb = createListVersionsStub();
const users = [];
stubServerModule('db.js', {
    listVersions: listVersionsDb,
    users: createUsersStub(users),
    follows: { findMany() { return Promise.resolve([]); } },
});

const { publishVersion } = require('../server/list-versions.js');
const router = require('../server/public-endpoints.js');

let passed = 0; let failed = 0;
function assert(desc, cond) {
    if (cond) { console.log(`  PASS  ${desc}`); passed++; }
    else { console.error(`  FAIL  ${desc}`); failed++; }
}

function getList(externalId) {
    const layer = router.stack.find((l) => l.route && l.route.path === '/api/public/list/:externalId' && l.route.methods.get);
    return new Promise((resolve) => {
        const res = {
            statusCode: 200,
            status(code) { this.statusCode = code; return this; },
            json(body) { resolve({ status: this.statusCode, body }); },
        };
        layer.route.stack[0].handle({ params: { externalId }, headers: {} }, res);
    });
}

async function run() {
    const owner = buildOwnerUser();
    users.push(owner);

    let result = await getList('abc123');
    assert('a shared list without a snapshot is 404', result.status === 404);

    await publishVersion(owner, 'abc123', '');
    result = await getList('abc123');
    assert('after publish the list is served', result.status === 200 && result.body.list.name === 'PCT');
    const names = result.body.categories.flatMap((c) => c.items.map((i) => i.name)).sort();
    assert('served categories hold the published items only', names.join() === 'Stove,Tent');
    assert('served payload carries the author', result.body.username === 'alice' && result.body.authorDisplayName === 'Alice A');

    owner.library.lists[0].name = 'LIVE EDIT';
    owner.library.items[0].name = 'Live tent';
    result = await getList('abc123');
    assert('unpublished list edits are invisible', result.body.list.name === 'PCT' && result.body.categories[0].items[0].name === 'Tent');

    owner.library.lists[0].copyable = true;
    owner.library.lists[0].visibility = 'shareable';
    result = await getList('abc123');
    assert('share settings come from the live list', result.body.list.copyable === true && result.body.list.visibility === 'shareable');

    console.log('\n--- externalId collision ---');
    const impostor = buildOwnerUser({ username: 'mallory' });
    users.unshift(impostor); // a non-unique externalId query would return this account first
    result = await getList('abc123');
    assert('the real publisher is served even when an impostor shares the externalId', result.status === 200 && result.body.username === 'alice');
    const claimOnly = buildOwnerUser({ externalId: 'claim-only', username: 'mallory' });
    users.unshift(claimOnly);
    result = await getList('claim-only');
    assert('a claimed but never-published externalId is 404', result.status === 404);
    users.splice(users.indexOf(impostor), 1);
    users.splice(users.indexOf(claimOnly), 1);

    owner.library.lists[0].visibility = 'private';
    result = await getList('abc123');
    assert('unsharing takes effect immediately', result.status === 404);

    result = await getList('ghost');
    assert('unknown externalId is 404', result.status === 404);

    console.log(`\n${passed} passed, ${failed} failed`);
    process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => { console.error(err); process.exit(1); });
