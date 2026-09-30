// test/unit-reports.js
'use strict';

const { ObjectId } = require('mongodb');
const { createListVersionsStub, createUsersStub, buildOwnerUser } = require('./fixtures/list-versions-fixtures.js');

// --- fixtures ---
const reporterUser = {
    _id: new ObjectId(),
    username: 'alice',
};

const moderatorUser = {
    _id: new ObjectId(),
    username: 'mod',
};

const existingReport = {
    _id: new ObjectId(),
    reporterId: reporterUser._id,
    reporterUsername: reporterUser.username,
    targetType: 'list',
    targetId: 'list-abc',
    reason: 'spam',
    status: 'pending',
    createdAt: new Date('2026-06-10T10:00:00Z'),
};

const resolvedReport = {
    _id: new ObjectId(),
    reporterId: new ObjectId(),
    reporterUsername: 'bob',
    targetType: 'user',
    targetId: 'userxyz',
    reason: 'inappropriate',
    status: 'resolved',
    createdAt: new Date('2026-06-09T10:00:00Z'),
};

// --- stubs ---
let reportsStore = [];
let savedDoc = null;
const usersStore = [];
const listVersionsStub = createListVersionsStub();

const dbStub = {
    users: createUsersStub(usersStore),
    listVersions: listVersionsStub,
    reports: {
        findOne(query) {
            if (query._id) {
                return Promise.resolve(reportsStore.find(r => r._id.toString() === query._id.toString()) || null);
            }
            return Promise.resolve(reportsStore.find(r =>
                r.reporterId.toString() === (query.reporterId ? query.reporterId.toString() : '') &&
                r.targetType === query.targetType &&
                r.targetId === query.targetId
            ) || null);
        },
        findMany(query) {
            return Promise.resolve(reportsStore.filter(r => r.status === query.status));
        },
        save(doc) {
            savedDoc = doc;
            if (!doc._id) doc._id = new ObjectId();
            const idx = reportsStore.findIndex(r => r._id && r._id.toString() === doc._id.toString());
            if (idx >= 0) reportsStore[idx] = { ...reportsStore[idx], ...doc };
            else reportsStore.push(doc);
            return Promise.resolve(doc);
        },
    },
};

require.cache[require.resolve('../server/db.js')] = {
    exports: dbStub, id: require.resolve('../server/db.js'),
    filename: require.resolve('../server/db.js'), loaded: true, children: [], paths: [],
};

const authStub = {
    authenticateUser(req, res, cb) { cb(req, res, reporterUser); },
    authenticateModerator(req, res, cb) { cb(req, res, moderatorUser); },
};
require.cache[require.resolve('../server/auth.js')] = {
    exports: authStub, id: require.resolve('../server/auth.js'),
    filename: require.resolve('../server/auth.js'), loaded: true, children: [], paths: [],
};

const router = require('../server/report-endpoints.js');
const { publishVersion } = require('../server/list-versions.js');

// --- helpers ---
let passed = 0; let failed = 0;
function assert(desc, cond) {
    if (cond) { console.log(`  PASS  ${desc}`); passed++; }
    else { console.error(`  FAIL  ${desc}`); failed++; }
}

function makeRes(resolve) {
    let statusCode = 200;
    return {
        status(code) { statusCode = code; return this; },
        json(data) { resolve({ statusCode, data }); },
    };
}

// --- tests ---
async function run() {
    // --- route existence ---
    const postRoute = router.stack.find(l => l.route && l.route.path === '/' && l.route.methods.post);
    assert('POST / route exists', Boolean(postRoute));

    const getRoute = router.stack.find(l => l.route && l.route.path === '/' && l.route.methods.get);
    assert('GET / route exists', Boolean(getRoute));

    const patchRoute = router.stack.find(l => l.route && l.route.path === '/:id' && l.route.methods.patch);
    assert('PATCH /:id route exists', Boolean(patchRoute));

    const featureRoute = router.stack.find(l => l.route && l.route.path === '/feature/:externalId' && l.route.methods.post);
    assert('POST /feature/:externalId route exists', Boolean(featureRoute));

    const unpublishRoute = router.stack.find(l => l.route && l.route.path === '/unpublish/:externalId' && l.route.methods.post);
    assert('POST /unpublish/:externalId route exists', Boolean(unpublishRoute));

    if (!postRoute || !getRoute || !patchRoute || !featureRoute || !unpublishRoute) {
        console.error('Skipping functional tests — routes missing');
        console.log(`\n${passed} passed, ${failed} failed`);
        process.exit(1);
    }

    // --- POST / : valid report creation ---
    {
        reportsStore = [];
        savedDoc = null;
        const req = { body: { targetType: 'list', targetId: 'list-abc', reason: 'spam' } };
        const { statusCode, data } = await new Promise(resolve => {
            const res = makeRes(resolve);
            postRoute.route.stack[0].handle(req, res, () => {});
        });

        assert('POST / valid report returns 200', statusCode === 200);
        assert('POST / valid report returns { ok: true }', data && data.ok === true);
        assert('POST / valid report does not set alreadyReported', !data.alreadyReported);
        assert('POST / calls db.reports.save', savedDoc !== null);
        assert('POST / saved doc has correct targetType', savedDoc && savedDoc.targetType === 'list');
        assert('POST / saved doc has correct targetId', savedDoc && savedDoc.targetId === 'list-abc');
        assert('POST / saved doc has correct reason', savedDoc && savedDoc.reason === 'spam');
        assert('POST / saved doc has status pending', savedDoc && savedDoc.status === 'pending');
        assert('POST / saved doc has reporterUsername', savedDoc && savedDoc.reporterUsername === 'alice');
        assert('POST / saved doc has createdAt', savedDoc && savedDoc.createdAt instanceof Date);
    }

    // --- POST / : duplicate report returns alreadyReported ---
    {
        reportsStore = [existingReport];
        savedDoc = null;
        const req = { body: { targetType: 'list', targetId: 'list-abc', reason: 'spam' } };
        const { statusCode, data } = await new Promise(resolve => {
            const res = makeRes(resolve);
            postRoute.route.stack[0].handle(req, res, () => {});
        });

        assert('POST / duplicate returns 200', statusCode === 200);
        assert('POST / duplicate returns alreadyReported: true', data && data.alreadyReported === true);
        assert('POST / duplicate does NOT call save', savedDoc === null);
    }

    // --- POST / : invalid targetType ---
    {
        reportsStore = [];
        const req = { body: { targetType: 'comment', targetId: 'abc', reason: 'spam' } };
        const { statusCode, data } = await new Promise(resolve => {
            const res = makeRes(resolve);
            postRoute.route.stack[0].handle(req, res, () => {});
        });

        assert('POST / invalid targetType returns 400', statusCode === 400);
        assert('POST / invalid targetType returns message', data && typeof data.message === 'string');
    }

    // --- POST / : invalid reason ---
    {
        reportsStore = [];
        const req = { body: { targetType: 'user', targetId: 'bob', reason: 'hate' } };
        const { statusCode, data } = await new Promise(resolve => {
            const res = makeRes(resolve);
            postRoute.route.stack[0].handle(req, res, () => {});
        });

        assert('POST / invalid reason returns 400', statusCode === 400);
        assert('POST / invalid reason returns message', data && typeof data.message === 'string');
    }

    // --- POST / : missing targetId ---
    {
        reportsStore = [];
        const req = { body: { targetType: 'list', reason: 'spam' } };
        const { statusCode, data } = await new Promise(resolve => {
            const res = makeRes(resolve);
            postRoute.route.stack[0].handle(req, res, () => {});
        });

        assert('POST / missing targetId returns 400', statusCode === 400);
        assert('POST / missing targetId returns message', data && typeof data.message === 'string');
    }

    // --- POST / : targetType user is valid ---
    {
        reportsStore = [];
        savedDoc = null;
        const req = { body: { targetType: 'user', targetId: 'bob', reason: 'fake' } };
        const { statusCode, data } = await new Promise(resolve => {
            const res = makeRes(resolve);
            postRoute.route.stack[0].handle(req, res, () => {});
        });

        assert('POST / targetType user is valid', statusCode === 200);
        assert('POST / targetType user saved correctly', savedDoc && savedDoc.targetType === 'user');
    }

    // --- GET / : returns only pending reports ---
    {
        reportsStore = [existingReport, resolvedReport];
        const req = { body: {} };
        const { statusCode, data } = await new Promise(resolve => {
            const res = makeRes(resolve);
            getRoute.route.stack[0].handle(req, res, () => {});
        });

        assert('GET / returns 200', statusCode === 200);
        assert('GET / response has reports array', Array.isArray(data && data.reports));
        assert('GET / returns only pending reports', data.reports.every(r => r.status === 'pending'));
        assert('GET / does not return resolved reports', data.reports.length === 1);
    }

    // --- GET / : reports sorted newest first ---
    {
        const olderReport = {
            ...existingReport,
            _id: new ObjectId(),
            createdAt: new Date('2026-06-08T00:00:00Z'),
        };
        const newerReport = {
            ...existingReport,
            _id: new ObjectId(),
            createdAt: new Date('2026-06-12T00:00:00Z'),
        };
        reportsStore = [olderReport, newerReport];
        const req = { body: {} };
        const { data } = await new Promise(resolve => {
            const res = makeRes(resolve);
            getRoute.route.stack[0].handle(req, res, () => {});
        });

        assert('GET / reports sorted newest first',
            data.reports.length === 2 &&
            new Date(data.reports[0].createdAt) >= new Date(data.reports[1].createdAt)
        );
    }

    // --- PATCH /:id : resolve a report ---
    {
        const targetReport = { ...existingReport, _id: new ObjectId() };
        reportsStore = [targetReport];
        savedDoc = null;
        const req = { params: { id: targetReport._id.toString() }, body: { status: 'resolved' } };
        const { statusCode, data } = await new Promise(resolve => {
            const res = makeRes(resolve);
            patchRoute.route.stack[0].handle(req, res, () => {});
        });

        assert('PATCH /:id resolve returns 200', statusCode === 200);
        assert('PATCH /:id resolve returns { ok: true }', data && data.ok === true);
        assert('PATCH /:id save called with resolved status', savedDoc && savedDoc.status === 'resolved');
        assert('PATCH /:id save called with resolvedAt', savedDoc && savedDoc.resolvedAt instanceof Date);
    }

    // --- PATCH /:id : dismiss a report ---
    {
        const targetReport = { ...existingReport, _id: new ObjectId() };
        reportsStore = [targetReport];
        savedDoc = null;
        const req = { params: { id: targetReport._id.toString() }, body: { status: 'dismissed' } };
        const { statusCode, data } = await new Promise(resolve => {
            const res = makeRes(resolve);
            patchRoute.route.stack[0].handle(req, res, () => {});
        });

        assert('PATCH /:id dismiss returns 200', statusCode === 200);
        assert('PATCH /:id dismiss returns { ok: true }', data && data.ok === true);
        assert('PATCH /:id save called with dismissed status', savedDoc && savedDoc.status === 'dismissed');
    }

    // --- PATCH /:id : invalid status ---
    {
        const targetReport = { ...existingReport, _id: new ObjectId() };
        reportsStore = [targetReport];
        const req = { params: { id: targetReport._id.toString() }, body: { status: 'deleted' } };
        const { statusCode, data } = await new Promise(resolve => {
            const res = makeRes(resolve);
            patchRoute.route.stack[0].handle(req, res, () => {});
        });

        assert('PATCH /:id invalid status returns 400', statusCode === 400);
        assert('PATCH /:id invalid status returns message', data && typeof data.message === 'string');
    }

    // --- PATCH /:id : report not found ---
    {
        reportsStore = [];
        const req = { params: { id: new ObjectId().toString() }, body: { status: 'resolved' } };
        const { statusCode, data } = await new Promise(resolve => {
            const res = makeRes(resolve);
            patchRoute.route.stack[0].handle(req, res, () => {});
        });

        assert('PATCH /:id not found returns 404', statusCode === 404);
        assert('PATCH /:id not found returns message', data && typeof data.message === 'string');
    }

    // --- POST /feature/:externalId : resolves owner via published snapshot, impostor immune ---
    {
        usersStore.length = 0;
        const owner = buildOwnerUser({ username: 'owner1' });
        const impostor = buildOwnerUser({ username: 'mallory' }); // same externalId 'abc123', never published
        usersStore.push(impostor, owner); // impostor listed first — a naive findOne on externalId would hit it first
        await publishVersion(owner, 'abc123', '');

        const req = { params: { externalId: 'abc123' } };
        const { statusCode, data } = await new Promise(resolve => {
            const res = makeRes(resolve);
            featureRoute.route.stack[0].handle(req, res, () => {});
        });

        assert('POST /feature toggles the real published owner\'s list', statusCode === 200 && data.ok === true && data.featured === true);
        const ownerList = owner.library.lists.find(l => l.externalId === 'abc123');
        const impostorList = impostor.library.lists.find(l => l.externalId === 'abc123');
        assert('POST /feature featured the real owner\'s list', ownerList.featured === true);
        assert('POST /feature does not touch the impostor\'s colliding list', impostorList.featured !== true);
    }

    // --- POST /feature/:externalId : unpublished/unknown externalId is 404 ---
    {
        usersStore.length = 0;
        const req = { params: { externalId: 'ghost' } };
        const { statusCode, data } = await new Promise(resolve => {
            const res = makeRes(resolve);
            featureRoute.route.stack[0].handle(req, res, () => {});
        });

        assert('POST /feature unknown externalId returns 404', statusCode === 404);
        assert('POST /feature unknown externalId returns message', data && typeof data.message === 'string');
    }

    // --- POST /unpublish/:externalId : resolves owner via published snapshot, impostor immune ---
    {
        usersStore.length = 0;
        const owner = buildOwnerUser({ username: 'owner2', externalId: 'unpub1' });
        const impostor = buildOwnerUser({ username: 'eve', externalId: 'unpub1' }); // never published
        usersStore.push(impostor, owner); // impostor listed first
        await publishVersion(owner, 'unpub1', '');

        const req = { params: { externalId: 'unpub1' } };
        const { statusCode, data } = await new Promise(resolve => {
            const res = makeRes(resolve);
            unpublishRoute.route.stack[0].handle(req, res, () => {});
        });

        assert('POST /unpublish returns ok', statusCode === 200 && data.ok === true);
        const ownerList = owner.library.lists.find(l => l.externalId === 'unpub1');
        const impostorList = impostor.library.lists.find(l => l.externalId === 'unpub1');
        assert('POST /unpublish sets the real owner\'s list private', ownerList.visibility === 'private');
        assert('POST /unpublish does not touch the impostor\'s colliding list', impostorList.visibility !== 'private');
    }

    // --- summary ---
    console.log(`\n${passed} passed, ${failed} failed`);
    if (failed > 0) process.exit(1);
}

run().catch(err => { console.error(err); process.exit(1); });
