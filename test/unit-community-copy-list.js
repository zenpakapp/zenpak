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
            visibility: 'public',
            categories: [],
        }],
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
    const res = {
        status(code) { this._status = code; return this; },
        json(data) { responseData = data; },
    };

    await copyRoute.route.stack[0].handle(req, res);

    assert('returns listId', responseData && typeof responseData.listId !== 'undefined');
    assert('saves user', savedUsers.length > 0);

    const savedCopy = (savedUsers[0].library.lists || []).find(l => l.name === 'Copy of PCT Section J');
    assert('copy has correct name', Boolean(savedCopy));
    assert('copy has new id', savedCopy && String(savedCopy.id) !== String(ownerUser.library.lists[0].id));

    // Test: cannot copy own list
    savedUsers.length = 0;
    const ownReq = { params: { externalId: 'abc123' }, body: {} };
    let ownResponse;
    const ownRes = {
        _status: 200,
        status(code) { this._status = code; return this; },
        json(data) { ownResponse = data; },
    };
    // Temporarily make authStub return ownerUser
    authStub.authenticateUser = (req, res, cb) => cb(req, res, ownerUser);
    await copyRoute.route.stack[0].handle(ownReq, ownRes);
    assert('cannot copy own list (403)', ownRes._status === 403);
    // Restore
    authStub.authenticateUser = (req, res, cb) => cb(req, res, copyUser);

    console.log(`\n${passed} passed, ${failed} failed`);
    process.exit(failed > 0 ? 1 : 0);
}
run().catch(e => { console.error(e); process.exit(1); });
