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

    console.log(`\n${passed} passed, ${failed} failed`);
    process.exit(failed > 0 ? 1 : 0);
}
run().catch(e => { console.error(e); process.exit(1); });
