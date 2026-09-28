'use strict';

const { createListVersionsStub, buildOwnerUser, stubServerModule } = require('./fixtures/list-versions-fixtures.js');

const listVersionsDb = createListVersionsStub();
const projections = [];
const publicListsDb = {
    deleteOne(filter) {
        const i = projections.findIndex((p) => p.externalId === filter.externalId);
        if (i >= 0) projections.splice(i, 1);
        return Promise.resolve();
    },
    updateOne(filter, update) {
        const i = projections.findIndex((p) => p.externalId === filter.externalId);
        if (i >= 0) projections[i] = { ...projections[i], ...update.$set };
        else projections.push({ ...update.$set });
        return Promise.resolve();
    },
    deleteMany(filter) {
        const keep = projections.filter((p) => String(p.ownerId) !== String(filter.ownerId) || filter.externalId.$nin.includes(p.externalId));
        projections.length = 0;
        projections.push(...keep);
        return Promise.resolve();
    },
};
stubServerModule('db.js', {
    listVersions: listVersionsDb,
    publicLists: publicListsDb,
    publicListStats: { findOne() { return Promise.resolve(null); } },
});

const { publishVersion } = require('../server/list-versions.js');
const { syncUserPublicLists, buildPublicListProjection } = require('../server/public-list-projections.js');

let passed = 0; let failed = 0;
function assert(desc, cond) {
    if (cond) { console.log(`  PASS  ${desc}`); passed++; }
    else { console.error(`  FAIL  ${desc}`); failed++; }
}

async function run() {
    const owner = buildOwnerUser();

    await syncUserPublicLists(owner);
    assert('a discoverable list without a snapshot is not projected', projections.length === 0);

    await publishVersion(owner, 'abc123', '');
    await syncUserPublicLists(owner);
    assert('after publish the list is projected', projections.length === 1 && projections[0].externalId === 'abc123');
    assert('projection totals come from the snapshot', projections[0].totalQty === 3 && projections[0].totalBaseWeight === 1100000);

    owner.library.lists[0].name = 'LIVE EDIT';
    owner.library.items[0].weight = 1;
    await syncUserPublicLists(owner);
    assert('projection ignores unpublished live edits', projections[0].name === 'PCT' && projections[0].totalBaseWeight === 1100000);

    owner.library.lists[0].visibility = 'shareable';
    await syncUserPublicLists(owner);
    assert('a list that is no longer discoverable is removed from Discover', projections.length === 0);
    owner.library.lists[0].visibility = 'discoverable';

    const impostor = buildOwnerUser({ username: 'mallory' });
    await syncUserPublicLists(impostor);
    assert('a snapshot owned by another account is never projected for a claimant', projections.every((p) => p.ownerUsername !== 'mallory'));

    const live = buildPublicListProjection(buildOwnerUser(), buildOwnerUser().library.lists[0], {}, null);
    assert('without a version the projection still builds from the live list (backward compatible)', live.name === 'PCT' && live.externalId === 'abc123');

    console.log(`\n${passed} passed, ${failed} failed`);
    process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => { console.error(err); process.exit(1); });
