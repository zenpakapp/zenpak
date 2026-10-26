'use strict';

const { createListVersionsStub, buildOwnerUser, stubServerModule } = require('./fixtures/list-versions-fixtures.js');

const listVersionsDb = createListVersionsStub();
const projections = [];
const publicListsDb = {
    deleteOne(filter) {
        const i = projections.findIndex((p) => p.externalId === filter.externalId
            && (!filter.ownerId || String(p.ownerId) === String(filter.ownerId)));
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
        const keep = projections.filter((p) => String(p.ownerId) !== String(filter.ownerId)
            || (filter.externalId && filter.externalId.$nin.includes(p.externalId)));
        projections.length = 0;
        projections.push(...keep);
        return Promise.resolve();
    },
};
const ownersForBackfill = [];
const lacksField = (p, clause) => (clause.searchTokens ? !Array.isArray(p.searchTokens) : false)
    || (clause.ownerAvatarUrl ? p.ownerAvatarUrl === undefined : false);
publicListsDb.findMany = (query) => Promise.resolve(
    projections.filter((p) => (query.$or ? query.$or.some((clause) => lacksField(p, clause)) : lacksField(p, query))),
);
stubServerModule('db.js', {
    users: {
        findMany: (query) => Promise.resolve(
            ownersForBackfill.filter((u) => query._id.$in.some((id) => String(id) === String(u._id))),
        ),
    },
    listVersions: listVersionsDb,
    publicLists: publicListsDb,
    publicListStats: { findOne() { return Promise.resolve(null); } },
});

const { publishVersion } = require('../server/list-versions.js');
const { syncUserPublicLists, buildPublicListProjection, reindexMissingSearchTokens } = require('../server/public-list-projections.js');

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

    const tokens = projections[0].searchTokens || [];
    assert('projection has search tokens for the list name and its author', tokens.includes('pct') && tokens.includes('alice'));
    assert('projection has search tokens for item names and brands', ['tent', 'zpacks', 'stove', 'brs'].every((t) => tokens.includes(t)));
    assert('items of another list are not in the search tokens', !tokens.includes('unrelated'));

    owner.library.lists[0].name = 'LIVE EDIT';
    owner.library.items[0].weight = 1;
    await syncUserPublicLists(owner);
    assert('projection ignores unpublished live edits', projections[0].name === 'PCT' && projections[0].totalBaseWeight === 1100000);

    owner.library.lists[0].visibility = 'shareable';
    await syncUserPublicLists(owner);
    assert('a list that is no longer discoverable is removed from Discover', projections.length === 0);
    owner.library.lists[0].visibility = 'discoverable';
    await syncUserPublicLists(owner);
    assert('owner projection re-synced before the impostor test', projections.length === 1 && projections[0].ownerUsername === 'alice');

    const impostor = buildOwnerUser({ username: 'mallory' });
    await syncUserPublicLists(impostor);
    assert('a snapshot owned by another account is never projected for a claimant', projections.every((p) => p.ownerUsername !== 'mallory'));
    assert('the real owner\'s projection survives an impostor syncing a colliding externalId', projections.some((p) => p.ownerUsername === 'alice' && p.externalId === 'abc123'));

    const live = buildPublicListProjection(buildOwnerUser(), buildOwnerUser().library.lists[0], {}, null);
    assert('without a version the projection still builds from the live list (backward compatible)', live.name === 'PCT' && live.externalId === 'abc123');
    assert('a live projection also gets search tokens from the owner library', Array.isArray(live.searchTokens) && live.searchTokens.includes('tent') && !live.searchTokens.includes('unrelated'));

    // Projections written before search existed get their tokens at startup.
    const legacyOwner = buildOwnerUser({ username: 'legacy' });
    legacyOwner.library.lists[0].externalId = 'legacy1';
    legacyOwner.library.lists[0].name = 'Legacy list';
    await publishVersion(legacyOwner, 'legacy1', '');
    await syncUserPublicLists(legacyOwner);
    const legacyProjection = projections.find((p) => p.externalId === 'legacy1');
    delete legacyProjection.searchTokens;
    ownersForBackfill.push(legacyOwner);
    const reindexed = await reindexMissingSearchTokens();
    assert('reindex reports how many projections it filled', reindexed === 1);
    assert('a legacy projection without tokens gets them', projections.find((p) => p.externalId === 'legacy1').searchTokens.includes('legacy'));
    assert('a second reindex finds nothing to do', await reindexMissingSearchTokens() === 0);

    // Projections written before the author's photo was projected get it at startup too.
    delete projections.find((p) => p.externalId === 'legacy1').ownerAvatarUrl;
    assert('a projection without the author photo field is reindexed', await reindexMissingSearchTokens() === 1);
    assert('it has the field again', projections.find((p) => p.externalId === 'legacy1').ownerAvatarUrl === '');
    assert('and a further reindex finds nothing', await reindexMissingSearchTokens() === 0);

    // A banned account has no public list in Discover or search, and gets them back when reinstated.
    const bannedOwner = buildOwnerUser({ externalId: 'ban1', username: 'spammer' });
    await publishVersion(bannedOwner, 'ban1', '');
    await syncUserPublicLists(bannedOwner);
    assert('a published list is projected before the ban', projections.some((p) => p.externalId === 'ban1'));
    bannedOwner.banned = true;
    await syncUserPublicLists(bannedOwner);
    assert('a ban removes every projection of the account', !projections.some((p) => p.externalId === 'ban1'));
    bannedOwner.banned = false;
    await syncUserPublicLists(bannedOwner);
    assert('lifting the ban projects the lists again', projections.some((p) => p.externalId === 'ban1'));

    console.log(`\n${passed} passed, ${failed} failed`);
    process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => { console.error(err); process.exit(1); });
