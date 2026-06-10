'use strict';

const { ObjectId } = require('mongodb');

const guideUser = {
    _id: new ObjectId(),
    username: 'alice',
    library: {
        entitlements: { plan: 'creator' },
        lists: [
            { id: 1, externalId: 'abc', name: 'PCT Section J', visibility: 'discoverable' },
            { id: 2, externalId: 'def', name: 'Private list', visibility: 'private' },
        ],
        insights: {
            listViews: { abc: 120, def: 5 },
            listCopies: { abc: 8 },
        },
    },
};

const followDocs = [{ _id: new ObjectId() }, { _id: new ObjectId() }];

const dbStub = {
    users: { findOne() { return Promise.resolve(guideUser); } },
    follows: { findMany() { return Promise.resolve(followDocs); } },
};
require.cache[require.resolve('../server/db.js')] = {
    exports: dbStub, id: require.resolve('../server/db.js'),
    filename: require.resolve('../server/db.js'), loaded: true, children: [], paths: [],
};

const authStub = { authenticateUser(req, res, cb) { cb(req, res, guideUser); } };
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
    const insightsRoute = router.stack.find(l => l.route && l.route.path === '/insights' && l.route.methods.get);
    assert('GET /insights route exists', Boolean(insightsRoute));
    if (!insightsRoute) return;

    let responseData;
    const req = { params: {}, query: {} };
    const res = {
        status(code) { this._status = code; return this; },
        json(data) { responseData = data; },
    };

    await new Promise(resolve => {
        res.json = (data) => { responseData = data; resolve(); };
        insightsRoute.route.stack[0].handle(req, res);
    });

    assert('returns totals', responseData && typeof responseData.totals === 'object');
    assert('totals.followers = 2', responseData.totals.followers === 2);
    assert('totals.views = 120 (public only)', responseData.totals.views === 120);
    assert('totals.copies = 8', responseData.totals.copies === 8);
    assert('lists array has 1 entry (public only)', responseData.lists && responseData.lists.length === 1);
    assert('list externalId is abc', responseData.lists[0].externalId === 'abc');
    assert('list viewCount = 120', responseData.lists[0].viewCount === 120);
    assert('list copyCount = 8', responseData.lists[0].copyCount === 8);

    // Test: non-guide user gets 403
    const baseUser = { _id: new ObjectId(), username: 'bob', library: { entitlements: { plan: 'free' }, lists: [] } };
    const origAuth = authStub.authenticateUser;
    authStub.authenticateUser = (req, res, cb) => cb(req, res, baseUser);
    let forbiddenStatus;
    await new Promise(resolve => {
        const forbidRes = {
            _status: 200,
            status(code) { this._status = code; return this; },
            json(data) { forbiddenStatus = forbidRes._status; resolve(); },
        };
        insightsRoute.route.stack[0].handle(req, forbidRes);
    });
    assert('non-guide gets 403', forbiddenStatus === 403);
    authStub.authenticateUser = origAuth;

    console.log(`\n${passed} passed, ${failed} failed`);
    process.exit(failed > 0 ? 1 : 0);
}
run().catch(e => { console.error(e); process.exit(1); });
