'use strict';

const { ObjectId } = require('mongodb');

const ownerUser = {
    _id: new ObjectId(),
    username: 'alice',
    library: {
        lists: [{ id: 1, externalId: 'abc', name: 'PCT Section J', visibility: 'discoverable' }],
        insights: {},
    },
};

let savedCount = 0;

const dbStub = {
    users: {
        findOne(query, cb) {
            if (query.token === 'viewer-token') {
                return Promise.resolve({ _id: new ObjectId('000000000000000000000002'), username: 'viewer' });
            }
            cb(null, ownerUser);
            return undefined;
        },
        save(user, cb) {
            savedCount++;
            cb();
        },
    },
};

require.cache[require.resolve('../server/db.js')] = {
    exports: dbStub, id: require.resolve('../server/db.js'),
    filename: require.resolve('../server/db.js'), loaded: true, children: [], paths: [],
};

const router = require('../server/public-endpoints.js');

let passed = 0; let failed = 0;
function assert(desc, cond) {
    if (cond) { console.log(`  PASS  ${desc}`); passed++; }
    else { console.error(`  FAIL  ${desc}`); failed++; }
}

function callInsight(req) {
    const route = router.stack.find(l => l.route && l.route.path === '/api/public/insight' && l.route.methods.post);
    return new Promise(resolve => {
        const res = {
            status(code) { this._status = code; return this; },
            json(data) { resolve({ status: this._status || 200, data }); },
        };
        route.route.stack[0].handle(req, res);
    });
}

async function run() {
    const baseReq = {
        body: { externalId: 'abc', type: 'listView', itemId: '' },
        cookies: { lp: 'viewer-token' },
        get(name) { return name.toLowerCase() === 'user-agent' ? 'unit-test-agent' : ''; },
        ip: '127.0.0.1',
    };

    await callInsight(baseReq);
    await callInsight(baseReq);

    assert('list view counted once for same logged-in user', ownerUser.library.insights.listViews && ownerUser.library.insights.listViews.abc === 1);
    assert('viewer identity is recorded once', ownerUser.library.insights.listViewers && ownerUser.library.insights.listViewers.abc.length === 1);

    await callInsight({
        ...baseReq,
        cookies: {},
        ip: '203.0.113.10',
        get(name) { return name.toLowerCase() === 'user-agent' ? 'anonymous-agent' : ''; },
    });
    await callInsight({
        ...baseReq,
        cookies: {},
        ip: '203.0.113.10',
        get(name) { return name.toLowerCase() === 'user-agent' ? 'anonymous-agent' : ''; },
    });

    assert('anonymous list view counted once per visitor fingerprint', ownerUser.library.insights.listViews && ownerUser.library.insights.listViews.abc === 2);
    assert('non-duplicate insight saves only when count changes', savedCount === 2);

    console.log(`\n${passed} passed, ${failed} failed`);
    process.exit(failed > 0 ? 1 : 0);
}

run().catch(e => { console.error(e); process.exit(1); });
