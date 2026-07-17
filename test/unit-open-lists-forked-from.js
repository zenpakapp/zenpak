// test/unit-open-lists-forked-from.js
'use strict';

const { ObjectId } = require('mongodb');

const ownerUser = {
    _id: new ObjectId(),
    username: 'fx',
    library: {
        lists: [{
            id: new ObjectId(),
            externalId: 'gr34-summer',
            name: 'GR34 Summer',
            visibility: 'discoverable',
            categoryIds: [],
        }],
        categories: [],
        items: [],
        publicProfile: { displayName: 'FX Bénard' },
    },
};

// No displayName set — must fall back to username.
const ownerUser2 = {
    _id: new ObjectId(),
    username: 'wayfarer42',
    library: {
        lists: [{
            id: new ObjectId(),
            externalId: 'weekend-budget',
            name: 'Weekend Budget Setup',
            visibility: 'indexable',
            categoryIds: [],
            // Simulates a list that is ITSELF a previous fork — its own forkedFrom
            // must never leak into the new copy's forkedFrom (direct-parent-only rule).
            forkedFrom: {
                externalId: 'some-root-list',
                ownerId: 'root-owner-id',
                ownerUsername: 'root-owner',
                ownerName: 'Root Owner',
                listName: 'Some Root List',
                copiedAt: '2026-01-01T00:00:00.000Z',
            },
        }],
        categories: [],
        items: [],
        publicProfile: { displayName: '' },
    },
};

const savedUsers = [];
const dbStub = {
    users: {
        findOne(query) {
            const extId = query['library.lists.externalId'];
            if (extId === 'gr34-summer') return Promise.resolve(ownerUser);
            if (extId === 'weekend-budget') return Promise.resolve(ownerUser2);
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

const copyUser = { _id: new ObjectId(), username: 'bob', library: { lists: [] } };
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

async function callCopy(externalId) {
    const copyRoute = router.stack.find(l => l.route && l.route.path === '/copy-list/:externalId' && l.route.methods.post);
    const req = { params: { externalId }, body: {} };
    return new Promise(resolve => {
        const res = {
            status(code) { this._status = code; return this; },
            json(data) { resolve(data); },
        };
        copyRoute.route.stack[0].handle(req, res);
    });
}

async function run() {
    const response1 = await callCopy('gr34-summer');
    assert('response has forkedFrom', Boolean(response1 && response1.forkedFrom));
    const f1 = response1.forkedFrom || {};
    assert('forkedFrom.externalId matches source list', f1.externalId === 'gr34-summer');
    assert('forkedFrom.ownerId matches source owner', f1.ownerId === String(ownerUser._id));
    assert('forkedFrom.ownerUsername matches source owner username', f1.ownerUsername === 'fx');
    assert('forkedFrom.ownerName uses publicProfile.displayName when set', f1.ownerName === 'FX Bénard');
    assert('forkedFrom.listName matches source list name', f1.listName === 'GR34 Summer');
    assert('forkedFrom.copiedAt is a valid ISO date', !Number.isNaN(Date.parse(f1.copiedAt)));

    const response2 = await callCopy('weekend-budget');
    const f2 = response2.forkedFrom || {};
    assert('forkedFrom.ownerName falls back to username when displayName is empty', f2.ownerName === 'wayfarer42');
    assert('forkedFrom references the direct parent (weekend-budget)', f2.externalId === 'weekend-budget');
    assert('forkedFrom does NOT leak the grandparent (some-root-list)', f2.externalId !== 'some-root-list');
    assert('forkedFrom.ownerUsername is the direct parent owner, not the root owner', f2.ownerUsername === 'wayfarer42');

    console.log(`\n${passed} passed, ${failed} failed`);
    process.exit(failed > 0 ? 1 : 0);
}
run().catch(e => { console.error(e); process.exit(1); });
