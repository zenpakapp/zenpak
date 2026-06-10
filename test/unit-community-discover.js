'use strict';

const { ObjectId } = require('mongodb');

// Stub db before requiring endpoints
const allUsers = [];
const dbStub = {
    users: {
        findMany(query) { return Promise.resolve(allUsers); },
    },
};
require.cache[require.resolve('../server/db.js')] = {
    exports: dbStub, id: require.resolve('../server/db.js'),
    filename: require.resolve('../server/db.js'), loaded: true, children: [], paths: [],
};

// Minimal auth stub — always unauthenticated for discover (public)
const authStub = { authenticateUser: () => {} };
require.cache[require.resolve('../server/auth.js')] = {
    exports: authStub, id: require.resolve('../server/auth.js'),
    filename: require.resolve('../server/auth.js'), loaded: true, children: [], paths: [],
};

const feedStub = { getFeedForUser: async () => ({ events: [], nextCursor: null }) };
require.cache[require.resolve('../server/feed-events.js')] = {
    exports: feedStub, id: require.resolve('../server/feed-events.js'),
    filename: require.resolve('../server/feed-events.js'), loaded: true, children: [], paths: [],
};

const router = require('../server/community-endpoints.js');

let passed = 0; let failed = 0;
function assert(desc, cond) {
    if (cond) { console.log(`  PASS  ${desc}`); passed++; }
    else { console.error(`  FAIL  ${desc}`); failed++; }
}

async function run() {
    // Find the discover route handler directly
    const discoverRoute = router.stack.find(l => l.route && l.route.path === '/discover');
    assert('GET /discover route exists', Boolean(discoverRoute));

    if (!discoverRoute) {
        console.error('Skipping remaining tests — route missing');
        console.log(`\n${passed} passed, ${failed} failed`);
        process.exit(failed > 0 ? 1 : 0);
        return;
    }

    // Test: returns empty list when no public lists
    allUsers.length = 0;
    allUsers.push({
        _id: new ObjectId(),
        username: 'alice',
        library: {
            entitlements: { plan: 'free' },
            lists: [{ id: 1, externalId: 'abc', name: 'My private list', visibility: 'private' }],
        },
    });

    let responseData;
    const req = { query: {} };
    const res = {
        status(code) { this._status = code; return this; },
        json(data) { responseData = data; },
    };
    await new Promise(resolve => {
        res.json = (data) => { responseData = data; resolve(); };
        discoverRoute.route.stack[0].handle(req, res);
    });

    assert('returns lists array', Array.isArray(responseData && responseData.lists));
    assert('empty when no public lists', responseData.lists.length === 0);

    // Test: returns public list
    allUsers.length = 0;
    allUsers.push({
        _id: new ObjectId(),
        username: 'bob',
        library: {
            entitlements: { plan: 'creator' },
            lists: [{
                id: 2,
                externalId: 'xyz',
                name: 'PCT Section J',
                visibility: 'public',
                totalBaseWeight: 4200,
                totalQty: 18,
                copyCount: 5,
                updatedAt: new Date('2026-06-01'),
            }],
        },
    });

    responseData = null;
    await new Promise(resolve => {
        res.json = (data) => { responseData = data; resolve(); };
        discoverRoute.route.stack[0].handle(req, res);
    });

    assert('returns 1 public list', responseData && responseData.lists.length === 1);
    assert('list has externalId', responseData.lists[0].externalId === 'xyz');
    assert('list has author', responseData.lists[0].author === 'bob');
    assert('list has authorTier guide', responseData.lists[0].authorTier === 'guide');
    assert('list has copyCount', responseData.lists[0].copyCount === 5);

    // Test: visibility=indexed lists are included
    allUsers.length = 0;
    allUsers.push({
        _id: new ObjectId(),
        username: 'carol',
        library: {
            entitlements: { plan: 'free' },
            lists: [{
                id: 3,
                externalId: 'indexed1',
                name: 'Indexed List',
                visibility: 'indexed',
                copyCount: 2,
                updatedAt: new Date('2026-06-05'),
            }],
        },
    });

    responseData = null;
    await new Promise(resolve => {
        res.json = (data) => { responseData = data; resolve(); };
        discoverRoute.route.stack[0].handle({ query: {} }, res);
    });

    assert('visibility=indexed list is included', responseData && responseData.lists.length === 1);
    assert('indexed list has correct externalId', responseData.lists[0].externalId === 'indexed1');

    // Test: nextCursor is null when fewer than 20 items
    assert('nextCursor is null when fewer than 20 items', responseData.nextCursor === null);

    // Test: sort=popular returns lists without cursor filtering and nextCursor is null
    allUsers.length = 0;
    const popularLists = [];
    for (let i = 0; i < 25; i++) {
        popularLists.push({
            id: 100 + i,
            externalId: `pop${i}`,
            name: `List ${i}`,
            visibility: 'public',
            copyCount: i,
            updatedAt: new Date(`2026-05-${String(i + 1).padStart(2, '0')}`),
        });
    }
    allUsers.push({
        _id: new ObjectId(),
        username: 'dave',
        library: {
            entitlements: { plan: 'free' },
            lists: popularLists,
        },
    });

    // With a cursor that would filter out all items if cursor were applied
    responseData = null;
    const futureDate = new Date('2026-01-01').toISOString(); // all updatedAt are after this
    await new Promise(resolve => {
        res.json = (data) => { responseData = data; resolve(); };
        discoverRoute.route.stack[0].handle({ query: { sort: 'popular', cursor: futureDate } }, res);
    });

    assert('sort=popular ignores cursor and returns results', responseData && responseData.lists.length === 20);
    assert('sort=popular nextCursor is null', responseData.nextCursor === null);
    assert('sort=popular returns highest copyCount first', responseData.lists[0].copyCount === 24);

    // Test: cursor exclusion on sort=recent (item with matching date is excluded)
    allUsers.length = 0;
    const d1 = new Date('2026-06-03T12:00:00.000Z');
    const d2 = new Date('2026-06-02T12:00:00.000Z');
    const d3 = new Date('2026-06-01T12:00:00.000Z');
    allUsers.push({
        _id: new ObjectId(),
        username: 'eve',
        library: {
            entitlements: { plan: 'free' },
            lists: [
                { id: 201, externalId: 'r1', name: 'Recent 1', visibility: 'public', copyCount: 0, updatedAt: d1 },
                { id: 202, externalId: 'r2', name: 'Recent 2', visibility: 'public', copyCount: 0, updatedAt: d2 },
                { id: 203, externalId: 'r3', name: 'Recent 3', visibility: 'public', copyCount: 0, updatedAt: d3 },
            ],
        },
    });

    // cursor = d2.toISOString(): items with updatedAt >= d2 should be excluded (r1 and r2)
    responseData = null;
    await new Promise(resolve => {
        res.json = (data) => { responseData = data; resolve(); };
        discoverRoute.route.stack[0].handle({ query: { sort: 'recent', cursor: d2.toISOString() } }, res);
    });

    assert('sort=recent with cursor excludes items at or after cursor', responseData && responseData.lists.length === 1);
    assert('sort=recent with cursor returns only older items', responseData.lists[0].externalId === 'r3');

    console.log(`\n${passed} passed, ${failed} failed`);
    process.exit(failed > 0 ? 1 : 0);
}
run().catch(e => { console.error(e); process.exit(1); });
