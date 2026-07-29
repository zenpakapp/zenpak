// test/unit-community-copy-list.js
'use strict';

const { ObjectId } = require('mongodb');

const ownerUser = {
    _id: new ObjectId(),
    username: 'alice',
    library: {
        lists: [{
            id: new ObjectId(),
            externalId: 'abc123',
            name: 'PCT Section J',
            visibility: 'discoverable',
            categoryIds: ['cat-hydration'],
            categories: [],
        }],
        categories: [{
            id: 'cat-hydration',
            name: 'Hydration',
            categoryItems: [
                { itemId: 'item-zero', qty: 0 },
                { itemId: 'item-two', qty: 2 },
                { itemId: 'item-half', qty: 0.5 },
            ],
        }],
        items: [
            { id: 'item-zero', name: 'Platypus - 2L', weight: 36, authorUnit: 'g' },
            { id: 'item-two', name: 'Water bottle pair', weight: 76, authorUnit: 'g' },
            { id: 'item-half', name: 'Half fuel can', weight: 110, authorUnit: 'g' },
        ],
    },
};

const copyUser = {
    _id: new ObjectId(),
    username: 'bob',
    library: { lists: [] },
};

const savedUsers = [];
const dbStub = {
    users: {
        findOne(query) {
            if (query['library.lists.externalId']) return Promise.resolve(ownerUser);
            return Promise.resolve(null);
        },
        save(user) {
            savedUsers.push(user);
            return Promise.resolve(user);
        },
    },
};

require.cache[require.resolve('../server/db.js')] = {
    exports: dbStub, id: require.resolve('../server/db.js'),
    filename: require.resolve('../server/db.js'), loaded: true, children: [], paths: [],
};

const authStub = {
    authenticateUser(req, res, cb) { cb(req, res, copyUser); },
};
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
    const copyRoute = router.stack.find(l => l.route && l.route.path === '/copy-list/:externalId' && l.route.methods.post);
    assert('POST /copy-list/:externalId route exists', Boolean(copyRoute));

    if (!copyRoute) {
        console.error('Skipping — route missing');
        return;
    }

    savedUsers.length = 0;
    let responseData;
    const req = { params: { externalId: 'abc123' }, body: {} };
    await new Promise(resolve => {
        const res = {
            status(code) { this._status = code; return this; },
            json(data) { responseData = data; resolve(); },
        };
        copyRoute.route.stack[0].handle(req, res);
    });

    assert('returns source list name', responseData && responseData.listName === 'PCT Section J');
    assert('saves source owner for copy count', savedUsers.some(u => u.username === 'alice'));
    assert('returns categories payload', responseData.categories && responseData.categories.length === 1);
    assert('copy payload preserves zero quantity', responseData.categories[0].categoryItems[0].qty === 0);
    assert('copy payload preserves quantity above one', responseData.categories[0].categoryItems[1].qty === 2);
    assert('copy payload preserves decimal quantity', responseData.categories[0].categoryItems[2].qty === 0.5);

    // Test: cannot copy own list
    savedUsers.length = 0;
    const ownReq = { params: { externalId: 'abc123' }, body: {} };
    let ownResponse;
    let ownStatus;
    // Temporarily make authStub return ownerUser
    authStub.authenticateUser = (req, res, cb) => cb(req, res, ownerUser);
    await new Promise(resolve => {
        const ownRes = {
            _status: 200,
            status(code) { ownStatus = code; this._status = code; return this; },
            json(data) { ownResponse = data; resolve(); },
        };
        copyRoute.route.stack[0].handle(ownReq, ownRes);
    });
    assert('cannot copy own list (403)', ownStatus === 403);
    // Restore
    authStub.authenticateUser = (req, res, cb) => cb(req, res, copyUser);

    console.log(`\n${passed} passed, ${failed} failed`);
    process.exit(failed > 0 ? 1 : 0);
}
run().catch(e => { console.error(e); process.exit(1); });
