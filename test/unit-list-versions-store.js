'use strict';

const { createListVersionsStub, buildOwnerUser, stubServerModule } = require('./fixtures/list-versions-fixtures.js');

const listVersionsDb = createListVersionsStub();
stubServerModule('db.js', { listVersions: listVersionsDb });

const { publishVersion, getLatest, getPublishStatus } = require('../server/list-versions.js');

let passed = 0; let failed = 0;
function assert(desc, cond) {
    if (cond) { console.log(`  PASS  ${desc}`); passed++; }
    else { console.error(`  FAIL  ${desc}`); failed++; }
}

async function run() {
    const owner = buildOwnerUser();

    console.log('\n--- publishVersion ---');
    const first = await publishVersion(owner, 'abc123', '  first cut  ');
    assert('first publish creates v1', first.version === 1 && first.created === true);
    const stored = await getLatest('abc123');
    assert('stored version keeps the trimmed note', stored.note === 'first cut');
    assert('stored version records the owner id', String(stored.ownerId) === String(owner._id));
    assert('stored version carries totals', stored.totals.qty === 3 && stored.totals.baseWeight === 1100000);
    assert('stored library never contains private list fields', !('copiedBy' in stored.library.lists[0]) && !('aiAnalysis' in stored.library.lists[0]));

    const again = await publishVersion(owner, 'abc123', '');
    assert('identical content is deduped (no new version)', again.version === 1 && again.created === false);
    assert('dedupe leaves exactly one row', listVersionsDb.rows.length === 1);

    owner.library.lists[0].visibility = 'shareable';
    owner.library.lists[0].copyable = true;
    const shareOnly = await publishVersion(owner, 'abc123', '');
    assert('changing only share settings does not create a version', shareOnly.created === false);

    owner.library.items[0].weight = 850000;
    const second = await publishVersion(owner, 'abc123', 'lighter tent');
    assert('changed content creates v2', second.version === 2 && second.created === true);

    assert('unknown externalId is not-found', (await publishVersion(owner, 'nope', '')).error === 'not-found');
    owner.library.lists[1].externalId = 'priv1';
    assert('private list cannot be published', (await publishVersion(owner, 'priv1', '')).error === 'private');

    const thief = buildOwnerUser({ username: 'mallory' });
    assert('another account claiming the same externalId gets a conflict', (await publishVersion(thief, 'abc123', '')).error === 'conflict');
    assert('conflict did not write a row', listVersionsDb.rows.length === 2);

    console.log('\n--- concurrent publish race ---');
    const racer = buildOwnerUser({ externalId: 'race1' });
    const realUpdateOne = listVersionsDb.updateOne;
    let raced = false;
    listVersionsDb.updateOne = (filter, update, options) => {
        if (!raced) {
            raced = true;
            listVersionsDb.rows.push({
                externalId: 'race1', version: 1, ownerId: racer._id, contentHash: 'other-writer', library: {}, totals: {},
            });
            return Promise.reject(Object.assign(new Error('E11000 duplicate key'), { code: 11000 }));
        }
        return realUpdateOne(filter, update, options);
    };
    const raceResult = await publishVersion(racer, 'race1', '');
    listVersionsDb.updateOne = realUpdateOne;
    assert('lost insert race retries and takes the next version number', raceResult.version === 2 && raceResult.created === true);

    console.log('\n--- getPublishStatus ---');
    const statusOwner = buildOwnerUser({ externalId: 'status1' });
    const before = await getPublishStatus(statusOwner, 'status1');
    assert('never published: version 0, no unpublished flag', before.latestVersion === 0 && before.hasUnpublishedChanges === false);
    await publishVersion(statusOwner, 'status1', '');
    const clean = await getPublishStatus(statusOwner, 'status1');
    assert('just published: version 1, clean', clean.latestVersion === 1 && clean.hasUnpublishedChanges === false && clean.publishedAt instanceof Date);
    statusOwner.library.items[0].weight = 123;
    assert('after an edit: unpublished changes flagged', (await getPublishStatus(statusOwner, 'status1')).hasUnpublishedChanges === true);
    assert('unknown list has no status', (await getPublishStatus(statusOwner, 'missing')) === null);
    assert('a claimant of someone else\'s externalId sees version 0', (await getPublishStatus(thief, 'abc123')).latestVersion === 0);

    console.log(`\n${passed} passed, ${failed} failed`);
    process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => { console.error(err); process.exit(1); });
