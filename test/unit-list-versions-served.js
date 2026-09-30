'use strict';

const {
    createListVersionsStub, createUsersStub, buildOwnerUser, stubServerModule,
} = require('./fixtures/list-versions-fixtures.js');

const listVersionsDb = createListVersionsStub();
const owner = buildOwnerUser();
const impostor = buildOwnerUser({ username: 'mallory' }); // same externalId 'abc123', never published
const users = [impostor, owner]; // impostor first: a non-unique externalId query would return the wrong account
stubServerModule('db.js', { listVersions: listVersionsDb, users: createUsersStub(users) });

const {
    publishVersion, getLatest, getServedUser, getPublishedOwner, getServedByExternalId,
    loadPublishedLibrary, loadPublishedLibraryByExternalId, deleteVersionsForOwner,
} = require('../server/list-versions.js');

let passed = 0; let failed = 0;
function assert(desc, cond) {
    if (cond) { console.log(`  PASS  ${desc}`); passed++; }
    else { console.error(`  FAIL  ${desc}`); failed++; }
}

async function run() {
    await publishVersion(owner, 'abc123', '');

    console.log('\n--- getServedUser ---');
    const served = await getServedUser(owner, 'abc123');
    assert('served user keeps live identity', served.username === 'alice' && String(served._id) === String(owner._id));
    assert('served library is the published content', served.library.items.find((i) => i.id === 11).weight === 900000);
    assert('served user reports the published version', served.publishedVersion === 1);

    owner.library.items[0].weight = 1;
    owner.library.lists[0].name = 'LIVE EDIT';
    const stillFrozen = await getServedUser(owner, 'abc123');
    assert('live edits after publish stay invisible', stillFrozen.library.items.find((i) => i.id === 11).weight === 900000 && stillFrozen.library.lists[0].name === 'PCT');

    owner.library.lists[0].copyable = true;
    owner.library.lists[0].visibility = 'shareable';
    const overlaid = await getServedUser(owner, 'abc123');
    assert('share settings are overlaid live', overlaid.library.lists[0].copyable === true && overlaid.library.lists[0].visibility === 'shareable');

    owner.library.lists[0].publicFields = { ...owner.library.lists[0].publicFields, downloadable: true };
    const publicFieldsOverlaid = await getServedUser(owner, 'abc123');
    assert('publicFields toggles are overlaid live without a new publish', publicFieldsOverlaid.library.lists[0].publicFields.downloadable === true);

    owner.library.publicProfile.displayName = 'Alice B';
    owner.library.entitlements.plan = 'creator';
    owner.library.totalUnit = 'lb';
    owner.library.itemUnit = 'oz';
    owner.library.currencySymbol = '£';
    owner.library.creator.disclosure = 'Updated disclosure';
    const libraryFieldsOverlaid = await getServedUser(owner, 'abc123');
    assert('profile display name is overlaid live without a new publish', libraryFieldsOverlaid.library.publicProfile.displayName === 'Alice B');
    assert('entitlements plan is overlaid live without a new publish', libraryFieldsOverlaid.library.entitlements.plan === 'creator');
    assert('totalUnit/itemUnit are overlaid live without a new publish', libraryFieldsOverlaid.library.totalUnit === 'lb' && libraryFieldsOverlaid.library.itemUnit === 'oz');
    assert('currencySymbol is overlaid live without a new publish', libraryFieldsOverlaid.library.currencySymbol === '£');
    assert('creator settings are overlaid live without a new publish', libraryFieldsOverlaid.library.creator.disclosure === 'Updated disclosure');
    owner.library.publicProfile.displayName = 'Alice A';
    owner.library.entitlements.plan = 'trail';
    owner.library.totalUnit = 'g';
    owner.library.itemUnit = 'g';
    owner.library.currencySymbol = '€';
    owner.library.creator.disclosure = 'Affiliate links inside';

    owner.library.lists[0].visibility = 'private';
    assert('unsharing takes effect immediately', (await getServedUser(owner, 'abc123')) === null);
    owner.library.lists[0].visibility = 'discoverable';

    assert('a shared list without a snapshot is not served', (await getServedUser(buildOwnerUser({ externalId: 'unpublished' }), 'unpublished')) === null);
    assert('a snapshot owned by another account is never served for a claimant', (await getServedUser(impostor, 'abc123')) === null);

    console.log('\n--- owner resolution by version (externalId collision) ---');
    const resolved = await getPublishedOwner('abc123');
    assert('the owner is the account that published, not the first externalId match', String(resolved._id) === String(owner._id));
    assert('an id nobody published resolves to no owner', (await getPublishedOwner('never-published')) === null);
    const byId = await getServedByExternalId('abc123');
    assert('served-by-externalId returns the real publisher despite the impostor', byId.username === 'alice' && byId.library.lists[0].name === 'PCT');
    owner.library.lists[0].visibility = 'private';
    assert('served-by-externalId respects live unsharing', (await getServedByExternalId('abc123')) === null);
    owner.library.lists[0].visibility = 'discoverable';

    console.log('\n--- loadPublishedLibrary ---');
    const loaded = await loadPublishedLibrary(owner, 'abc123');
    assert('hydrates the frozen list', loaded.list.name === 'PCT' && loaded.library.defaultListId === loaded.list.id);
    const loadedById = await loadPublishedLibraryByExternalId('abc123');
    assert('by-externalId variant resolves the real owner', String(loadedById.served._id) === String(owner._id) && loadedById.list.name === 'PCT');
    assert('nothing served → null', (await loadPublishedLibraryByExternalId('never-published')) === null);

    console.log('\n--- deleteVersionsForOwner ---');
    const other = buildOwnerUser({ externalId: 'other1', username: 'bob' });
    users.push(other);
    await publishVersion(other, 'other1', '');
    await deleteVersionsForOwner(other._id);
    assert('removes every version of that owner', (await getLatest('other1')) === null);
    assert('leaves other owners alone', (await getLatest('abc123')) !== null);
    assert('tolerates a missing id', (await deleteVersionsForOwner(undefined)) === undefined);

    console.log(`\n${passed} passed, ${failed} failed`);
    process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => { console.error(err); process.exit(1); });
