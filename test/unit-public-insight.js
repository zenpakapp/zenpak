'use strict';

const { ObjectId } = require('mongodb');

const { createListVersionsStub } = require('./fixtures/list-versions-fixtures.js');

const listVersionsDb = createListVersionsStub();

const ownerUser = {
    _id: new ObjectId(),
    username: 'alice',
    library: {
        version: '0.3',
        items: [],
        categories: [],
        lists: [{
            id: 1, externalId: 'abc', name: 'PCT Section J', visibility: 'discoverable', categoryIds: [],
        }],
        insights: {},
    },
};

const stats = {};
const viewers = [];

const dbStub = {
    listVersions: listVersionsDb,
    users: {
        findOne(query, cb) {
            if (query.token === 'viewer-token') {
                return Promise.resolve({ _id: new ObjectId('000000000000000000000002'), username: 'viewer' });
            }
            if (cb) { cb(null, ownerUser); return undefined; }
            return Promise.resolve(ownerUser);
        },
    },
    publicListStats: {
        findOne(filter) { return Promise.resolve(stats[filter.externalId] || null); },
        updateOne(filter, update) {
            const doc = stats[filter.externalId] || { externalId: filter.externalId };
            if (update.$inc) {
                for (const [key, value] of Object.entries(update.$inc)) {
                    doc[key] = (doc[key] || 0) + value;
                }
            }
            if (update.$set) Object.assign(doc, update.$set);
            if (update.$setOnInsert && !stats[filter.externalId]) Object.assign(doc, update.$setOnInsert);
            stats[filter.externalId] = doc;
            return Promise.resolve();
        },
    },
    publicLists: {
        updateOne() { return Promise.resolve(); },
    },
    publicListViewers: {
        save(doc) {
            if (viewers.some(v => v.externalId === doc.externalId && v.viewerKey === doc.viewerKey)) {
                const err = new Error('duplicate');
                err.code = 11000;
                return Promise.reject(err);
            }
            viewers.push({ ...doc, _id: new ObjectId() });
            return Promise.resolve();
        },
        findSorted() {
            return Promise.resolve(viewers.slice().sort((a, b) => b.createdAt - a.createdAt));
        },
        deleteOne(filter) {
            const idx = viewers.findIndex(v => String(v._id) === String(filter._id));
            if (idx >= 0) viewers.splice(idx, 1);
            return Promise.resolve();
        },
    },
};

require.cache[require.resolve('../server/db.js')] = {
    exports: dbStub, id: require.resolve('../server/db.js'),
    filename: require.resolve('../server/db.js'), loaded: true, children: [], paths: [],
};

const { buildFrozenLibrary } = require('../server/list-versions.js');

listVersionsDb.rows.push({
    externalId: 'abc',
    version: 1,
    ownerId: ownerUser._id,
    library: buildFrozenLibrary(ownerUser.library, 'abc'),
});

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

function callListRoute(externalId) {
    const route = router.stack.find(l => l.route && l.route.path === '/api/public/list/:externalId' && l.route.methods.get);
    return new Promise(resolve => {
        const res = {
            status(code) { this._status = code; return this; },
            json(data) { resolve({ status: this._status || 200, data }); },
        };
        route.route.stack[0].handle({ params: { externalId } }, res);
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

    assert('list view counted once for same logged-in user', stats.abc && stats.abc.viewCount === 1);
    assert('viewer identity is recorded once', viewers.filter(v => v.externalId === 'abc').length === 1);

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

    assert('anonymous list view counted once per visitor fingerprint', stats.abc && stats.abc.viewCount === 2);
    assert('non-duplicate insight writes only when count changes', viewers.filter(v => v.externalId === 'abc').length === 2);

    // The public page sends item.id as stored in the library (a number): it must be counted
    await callInsight({ ...baseReq, body: { externalId: 'abc', type: 'gearClick', itemId: 11 } });
    await callInsight({ ...baseReq, body: { externalId: 'abc', type: 'gearClick', itemId: '11' } });
    assert('gearClick with a numeric or string item id is counted', stats.abc['gearClicks.11'] === 2);
    const rejected = await callInsight({ ...baseReq, body: { externalId: 'abc', type: 'gearClick', itemId: { $gt: '' } } });
    assert('object item ids are rejected with 400', rejected.status === 400);

    const before = await callListRoute('abc');
    assert('public list payload starts with a zero copy count', before.data.copyCount === 0);
    await callInsight({ ...baseReq, body: { externalId: 'abc', type: 'listCopy', itemId: '' } });
    await callInsight({ ...baseReq, body: { externalId: 'abc', type: 'listCopy', itemId: '' } });
    const after = await callListRoute('abc');
    assert('public list payload exposes the copy count', after.data.copyCount === 2);

    console.log(`\n${passed} passed, ${failed} failed`);
    process.exit(failed > 0 ? 1 : 0);
}

run().catch(e => { console.error(e); process.exit(1); });
