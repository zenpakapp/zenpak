'use strict';

const { ObjectId } = require('mongodb');

// Stub db before requiring endpoints
const allUsers = [];
const projectedLists = [];
const dbStub = {
    users: {
        findMany(query) { return Promise.resolve(allUsers); },
    },
    publicLists: {
        findSorted(query, sort, limit) {
            let rows = projectedLists.filter((list) => {
                if (query.visibility && query.visibility.$in && !query.visibility.$in.includes(list.visibility)) return false;
                if (query.updatedAt && query.updatedAt.$lt && !(new Date(list.updatedAt) < query.updatedAt.$lt)) return false;
                return true;
            });
            const [[sortKey, sortDir]] = Object.entries(sort);
            rows = rows.slice().sort((a, b) => {
                const av = sortKey === 'updatedAt' ? new Date(a[sortKey]).getTime() : Number(a[sortKey] || 0);
                const bv = sortKey === 'updatedAt' ? new Date(b[sortKey]).getTime() : Number(b[sortKey] || 0);
                return sortDir < 0 ? bv - av : av - bv;
            });
            return Promise.resolve(rows.slice(0, limit));
        },
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

    // Test: uses public_lists projection when available
    allUsers.length = 0;
    projectedLists.length = 0;
    projectedLists.push({
        externalId: 'projection1',
        name: 'Projection List',
        visibility: 'discoverable',
        ownerUsername: 'projected-user',
        ownerDisplayName: 'Projected User',
        ownerTier: 'trail',
        totalBaseWeight: 1200,
        viewCount: 12,
        copyCount: 3,
        seasons: ['summer'],
        listTypes: ['weekend'],
        updatedAt: new Date('2026-06-10'),
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

    assert('uses public_lists projection when present', responseData && responseData.lists.length === 1 && responseData.lists[0].externalId === 'projection1');
    assert('projection includes author display name', responseData.lists[0].authorDisplayName === 'Projected User');
    projectedLists.length = 0;

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

    responseData = null;
    await new Promise(resolve => {
        res.json = (data) => { responseData = data; resolve(); };
        discoverRoute.route.stack[0].handle(req, res);
    });

    assert('returns lists array', Array.isArray(responseData && responseData.lists));
    assert('empty when no public lists', responseData.lists.length === 0);

    // Test: users.library is no longer scanned by discover without projection
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
                visibility: 'discoverable',
                totalBaseWeight: 4200,
                totalQty: 18,
                copyCount: 5,
                seasons: ['summer', '3-season'],
                listTypes: ['thru-hike'],
                updatedAt: new Date('2026-06-01'),
            }],
            insights: {
                listViews: { xyz: 42 },
            },
        },
    });

    responseData = null;
    await new Promise(resolve => {
        res.json = (data) => { responseData = data; resolve(); };
        discoverRoute.route.stack[0].handle(req, res);
    });

    assert('does not scan users.library for public lists', responseData && responseData.lists.length === 0);

    projectedLists.push({
        externalId: 'xyz',
        name: 'PCT Section J',
        visibility: 'discoverable',
        ownerUsername: 'bob',
        ownerDisplayName: 'Bob',
        ownerTier: 'guide',
        totalBaseWeight: 4200,
        totalQty: 18,
        copyCount: 5,
        viewCount: 42,
        seasons: ['summer', '3-season'],
        listTypes: ['thru-hike'],
        updatedAt: new Date('2026-06-01'),
    });

    responseData = null;
    await new Promise(resolve => {
        res.json = (data) => { responseData = data; resolve(); };
        discoverRoute.route.stack[0].handle(req, res);
    });

    assert('returns 1 projected public list', responseData && responseData.lists.length === 1);
    assert('list has externalId', responseData.lists[0].externalId === 'xyz');
    assert('list has author', responseData.lists[0].author === 'bob');
    assert('list has authorTier guide', responseData.lists[0].authorTier === 'guide');
    assert('list has copyCount', responseData.lists[0].copyCount === 5);
    assert('list has viewCount', responseData.lists[0].viewCount === 42);
    assert('list has seasons', Array.isArray(responseData.lists[0].seasons) && responseData.lists[0].seasons.includes('3-season'));
    assert('list has listTypes', Array.isArray(responseData.lists[0].listTypes) && responseData.lists[0].listTypes[0] === 'thru-hike');
    projectedLists.length = 0;

    // Test: visibility=indexed lists are included
    projectedLists.push({
        externalId: 'indexed1',
        name: 'Indexed List',
        visibility: 'indexable',
        ownerUsername: 'carol',
        ownerTier: 'base',
        copyCount: 2,
        updatedAt: new Date('2026-06-05'),
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

    // Test: sort=popular returns lists ordered by viewCount without cursor filtering and nextCursor is null
    projectedLists.length = 0;
    for (let i = 0; i < 25; i++) {
        const externalId = `pop${i}`;
        projectedLists.push({
            externalId,
            name: `List ${i}`,
            visibility: 'discoverable',
            ownerUsername: 'dave',
            ownerTier: 'base',
            copyCount: i,
            viewCount: i === 3 ? 99 : i,
            totalBaseWeight: i * 1000,
            seasons: i % 2 === 0 ? ['summer'] : ['winter'],
            listTypes: i % 3 === 0 ? ['thru-hike'] : ['weekend'],
            updatedAt: new Date(`2026-05-${String(i + 1).padStart(2, '0')}`),
        });
    }

    // With a cursor that would filter out all items if cursor were applied
    responseData = null;
    const futureDate = new Date('2026-01-01').toISOString(); // all updatedAt are after this
    await new Promise(resolve => {
        res.json = (data) => { responseData = data; resolve(); };
        discoverRoute.route.stack[0].handle({ query: { sort: 'popular', cursor: futureDate } }, res);
    });

    assert('sort=popular ignores cursor and returns results', responseData && responseData.lists.length === 20);
    assert('sort=popular nextCursor is null', responseData.nextCursor === null);
    assert('sort=popular returns highest viewCount first', responseData.lists[0].externalId === 'pop3');
    assert('sort=popular includes viewCount', responseData.lists[0].viewCount === 99);

    // Test: filters by base weight range, season, and list type
    responseData = null;
    await new Promise(resolve => {
        res.json = (data) => { responseData = data; resolve(); };
        discoverRoute.route.stack[0].handle({
            query: {
                sort: 'popular',
                minWeight: '4000',
                maxWeight: '10000',
                season: 'summer',
                type: 'weekend',
            },
        }, res);
    });

    assert('filters return matching lists', responseData && responseData.lists.length > 0);
    assert('filters by min/max weight', responseData.lists.every(l => l.totalBaseWeight >= 4000 && l.totalBaseWeight <= 10000));
    assert('filters by season', responseData.lists.every(l => l.seasons.includes('summer')));
    assert('filters by list type', responseData.lists.every(l => l.listTypes.includes('weekend')));

    projectedLists.length = 0;
    projectedLists.push({
        externalId: 'three-season',
        name: 'Three Season Pack',
        visibility: 'discoverable',
        ownerUsername: 'frank',
        ownerTier: 'base',
        seasons: ['3-season'],
        updatedAt: new Date('2026-06-06'),
    });

    responseData = null;
    await new Promise(resolve => {
        res.json = (data) => { responseData = data; resolve(); };
        discoverRoute.route.stack[0].handle({ query: { season: '3-season' } }, res);
    });

    assert('filters by 3-season pack label', responseData && responseData.lists.length === 1 && responseData.lists[0].externalId === 'three-season');

    // Test: cursor exclusion on sort=recent (item with matching date is excluded)
    projectedLists.length = 0;
    const d1 = new Date('2026-06-03T12:00:00.000Z');
    const d2 = new Date('2026-06-02T12:00:00.000Z');
    const d3 = new Date('2026-06-01T12:00:00.000Z');
    projectedLists.push(
        { externalId: 'r1', name: 'Recent 1', visibility: 'discoverable', ownerUsername: 'eve', ownerTier: 'base', copyCount: 0, updatedAt: d1 },
        { externalId: 'r2', name: 'Recent 2', visibility: 'discoverable', ownerUsername: 'eve', ownerTier: 'base', copyCount: 0, updatedAt: d2 },
        { externalId: 'r3', name: 'Recent 3', visibility: 'discoverable', ownerUsername: 'eve', ownerTier: 'base', copyCount: 0, updatedAt: d3 },
    );

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
