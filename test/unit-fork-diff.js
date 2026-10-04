'use strict';

const { ObjectId } = require('mongodb');
const {
    createListVersionsStub, createUsersStub, buildOwnerUser, stubServerModule,
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
            { id: 4, name: 'Pruned base', forkedFrom: { externalId: 'abc123', version: 7, ownerId: String(alice._id) } },
            { id: 5, name: 'Reused id', forkedFrom: { externalId: 'abc123', version: 1, ownerId: String(new ObjectId()) } },
            { id: 6, name: 'No owner recorded', forkedFrom: { externalId: 'abc123', version: 1 } },
        ],
    },
};

const listVersionsDb = createListVersionsStub();
const usersDb = createUsersStub([alice, bob]);
stubServerModule('db.js', { listVersions: listVersionsDb, users: usersDb });
const currentUser = bob;
stubServerModule('auth.js', { authenticateUser(req, res, cb) { cb(req, res, currentUser); } });
stubServerModule('public-list-projections.js', { syncUserPublicLists: async () => {} });

const { buildFrozenLibrary, hashFrozenLibrary, computeTotals } = require('../server/list-versions.js');
const { getForkDiff } = require('../server/fork-diff.js');
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

// v1 = fixture as-is. v2: Tent lighter + new link, Stove pricier and moved to Shelter,
// Cook renamed Kitchen and now holds a new Pad.
const v1 = buildFrozenLibrary(alice.library, 'abc123');
const live = JSON.parse(JSON.stringify(alice.library));
const tent = live.items.find((item) => item.id === 11);
tent.weight = 850000;
tent.url = 'https://zpacks.com/tent-v2';
live.items.find((item) => item.id === 12).price = 25;
live.items.push({
    id: 13, name: 'Pad', description: '', brand: 'Therm-a-Rest', weight: 400000, authorUnit: 'g', price: 0, url: '', affiliateUrl: '', promoCode: '', promoLabel: '',
});
live.categories.find((category) => category.id === 5).categoryItems.push({
    itemId: 12, qty: 2, worn: 0, consumable: false, star: 0,
});
const cook = live.categories.find((category) => category.id === 6);
cook.name = 'Kitchen';
cook.categoryItems = [{
    itemId: 13, qty: 1, worn: 0, consumable: false, star: 0,
}];
alice.library = live;
const v2 = buildFrozenLibrary(alice.library, 'abc123');
listVersionsDb.rows.push(versionRow(1, v1), versionRow(2, v2));

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
    console.log('\n--- getForkDiff ---');
    const result = await getForkDiff(bob, 1);
    assert('returns a diff for a tracked fork', Boolean(result) && result.sourceExternalId === 'abc123' && result.fromVersion === 1 && result.toVersion === 2);
    assert('carries the source currency', Boolean(result) && result.currencySymbol === '€');
    const diff = result ? result.diff : {
        added: [], removed: [], moved: [], modified: [], categoriesRenamed: [], totals: {},
    };
    const changeOf = (itemId, field) => {
        const entry = diff.modified.find((e) => e.item.id === itemId);
        return entry && entry.changes.find((change) => change.field === field);
    };
    assert('weight change of the Tent', changeOf(11, 'weight') && changeOf(11, 'weight').from === 900000 && changeOf(11, 'weight').to === 850000);
    assert('link change shown (author shows links)', Boolean(changeOf(11, 'publicUrl')));
    assert('price change shown (author shows prices)', changeOf(12, 'price') && changeOf(12, 'price').from === 20 && changeOf(12, 'price').to === 25);
    assert('Stove moved from Cook to Shelter', diff.moved.length === 1 && diff.moved[0].item.id === 12 && String(diff.moved[0].fromCategory.id) === '6' && String(diff.moved[0].toCategory.id) === '5');
    assert('Pad added', diff.added.length === 1 && diff.added[0].item.name === 'Pad');
    assert('nothing removed', diff.removed.length === 0);
    assert('Cook renamed to Kitchen', diff.categoriesRenamed.length === 1 && diff.categoriesRenamed[0].to === 'Kitchen');
    assert('totals from the public payloads', diff.totals.baseWeightFrom === 1100000 && diff.totals.baseWeightTo === 1450000 && diff.totals.qtyFrom === 3 && diff.totals.qtyTo === 4);
    assert('a string list id works too', Boolean(await getForkDiff(bob, '1')));
    const ownerLookup = usersDb.findManyCalls[usersDb.findManyCalls.length - 1];
    const projection = ownerLookup && ownerLookup.options && ownerLookup.options.projection;
    assert('the source owner is loaded with a projection, not the whole document', Boolean(projection) && projection['library.lists'] === 1 && projection['library.items'] === undefined && projection.password === undefined);

    assert('a legacy fork gets null', (await getForkDiff(bob, 2)) === null);
    assert('a list that is not a fork gets null', (await getForkDiff(bob, 3)) === null);
    assert('an unknown list id gets null', (await getForkDiff(bob, 99)) === null);
    assert('a missing base version gets null', (await getForkDiff(bob, 4)) === null);
    assert('an externalId now published by another account than the one copied gets null', (await getForkDiff(bob, 5)) === null);
    assert('a fork that recorded no source owner gets null', (await getForkDiff(bob, 6)) === null);

    const liveList = alice.library.lists[0];
    liveList.publicFields = { ...liveList.publicFields, price: false };
    const hiddenPrice = await getForkDiff(bob, 1);
    const stoveChanges = hiddenPrice && hiddenPrice.diff.modified.find((e) => e.item.id === 12);
    assert('price change hidden once the author hides prices', Boolean(hiddenPrice) && !(stoveChanges && stoveChanges.changes.some((change) => change.field === 'price')));
    liveList.publicFields = { ...liveList.publicFields, price: true };

    liveList.visibility = 'private';
    assert('a source back to private gets null', (await getForkDiff(bob, 1)) === null);
    liveList.visibility = 'discoverable';

    const v1Row = listVersionsDb.rows.find((row) => row.version === 1);
    const realOwner = v1Row.ownerId;
    v1Row.ownerId = new ObjectId();
    assert('a base version owned by someone else gets null', (await getForkDiff(bob, 1)) === null);
    v1Row.ownerId = realOwner;

    console.log('\n--- GET /api/lists/fork-diff/:listId ---');
    const ok = await callRoute('get', '/api/lists/fork-diff/:listId', { params: { listId: '1' } });
    assert('route returns 200 with the diff', ok.status === 200 && ok.body.toVersion === 2 && Array.isArray(ok.body.diff.added));
    const missing = await callRoute('get', '/api/lists/fork-diff/:listId', { params: { listId: '2' } });
    assert('route returns 404 for a legacy fork', missing.status === 404);

    console.log(`\n${passed} passed, ${failed} failed`);
    process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => { console.error(err); process.exit(1); });
