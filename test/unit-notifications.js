// test/unit-notifications.js
'use strict';

const { ObjectId } = require('mongodb');

// --- fixtures ---
const currentUser = {
    _id: new ObjectId(),
    username: 'alice',
};

const notifA = {
    _id: new ObjectId(),
    userId: currentUser._id,
    type: 'follow',
    actorUsername: 'bob',
    read: false,
    createdAt: new Date('2026-06-10T10:00:00Z'),
};

const notifB = {
    _id: new ObjectId(),
    userId: currentUser._id,
    type: 'copy',
    actorUsername: 'charlie',
    listName: 'PCT Section J',
    read: true,
    createdAt: new Date('2026-06-11T10:00:00Z'),
};

// Older notification to verify 50-item cap
const oldNotifs = Array.from({ length: 51 }, (_, i) => ({
    _id: new ObjectId(),
    userId: currentUser._id,
    type: 'follow',
    actorUsername: `user${i}`,
    read: false,
    createdAt: new Date(Date.now() - i * 1000),
}));

// --- stubs ---
let notificationsStore = [notifA, notifB];
let updateManyCalledWith = null;

const dbStub = {
    notifications: {
        findMany(query) {
            // match on userId string comparison
            return Promise.resolve(
                notificationsStore.filter(n => n.userId.toString() === query.userId.toString())
            );
        },
        updateMany(filter, update) {
            updateManyCalledWith = { filter, update };
            return Promise.resolve({ modifiedCount: 1 });
        },
    },
};

require.cache[require.resolve('../server/db.js')] = {
    exports: dbStub, id: require.resolve('../server/db.js'),
    filename: require.resolve('../server/db.js'), loaded: true, children: [], paths: [],
};

const authStub = {
    authenticateUser(req, res, cb) { cb(req, res, currentUser); },
};
require.cache[require.resolve('../server/auth.js')] = {
    exports: authStub, id: require.resolve('../server/auth.js'),
    filename: require.resolve('../server/auth.js'), loaded: true, children: [], paths: [],
};

const router = require('../server/notification-endpoints.js');

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
    const getRoute = router.stack.find(l => l.route && l.route.path === '/' && l.route.methods.get);
    assert('GET / route exists', Boolean(getRoute));

    const readAllRoute = router.stack.find(l => l.route && l.route.path === '/read-all' && l.route.methods.post);
    assert('POST /read-all route exists', Boolean(readAllRoute));

    if (!getRoute || !readAllRoute) {
        console.error('Skipping functional tests — routes missing');
        return;
    }

    // --- GET / : returns notifications sorted desc ---
    {
        notificationsStore = [notifA, notifB];
        const req = { body: {} };
        const { statusCode, data } = await new Promise(resolve => {
            const res = makeRes(resolve);
            getRoute.route.stack[0].handle(req, res, () => {});
        });

        assert('GET / returns 200', statusCode === 200);
        assert('GET / response has notifications array', Array.isArray(data.notifications));
        assert('GET / response has unreadCount', typeof data.unreadCount === 'number');
        assert('GET / notifications sorted newest first', data.notifications[0].createdAt >= data.notifications[1].createdAt);
        assert('GET / unreadCount counts only unread', data.unreadCount === 1);
    }

    // --- GET / : caps at 50 items ---
    {
        notificationsStore = oldNotifs; // 51 items
        const req = { body: {} };
        const { data } = await new Promise(resolve => {
            const res = makeRes(resolve);
            getRoute.route.stack[0].handle(req, res, () => {});
        });

        assert('GET / returns max 50 notifications', data.notifications.length === 50);
        notificationsStore = [notifA, notifB]; // reset
    }

    // --- GET / : empty store returns empty array ---
    {
        notificationsStore = [];
        const req = { body: {} };
        const { statusCode, data } = await new Promise(resolve => {
            const res = makeRes(resolve);
            getRoute.route.stack[0].handle(req, res, () => {});
        });

        assert('GET / with no notifications returns 200', statusCode === 200);
        assert('GET / with no notifications returns empty array', data.notifications.length === 0);
        assert('GET / with no notifications unreadCount is 0', data.unreadCount === 0);
        notificationsStore = [notifA, notifB]; // reset
    }

    // --- POST /read-all : calls updateMany with correct filter ---
    {
        updateManyCalledWith = null;
        const req = { body: {} };
        const { statusCode, data } = await new Promise(resolve => {
            const res = makeRes(resolve);
            readAllRoute.route.stack[0].handle(req, res, () => {});
        });

        assert('POST /read-all returns 200', statusCode === 200);
        assert('POST /read-all returns { ok: true }', data && data.ok === true);
        assert('POST /read-all calls updateMany', updateManyCalledWith !== null);
        assert('POST /read-all filter includes userId', updateManyCalledWith && updateManyCalledWith.filter.userId !== undefined);
        assert('POST /read-all filter targets read: false', updateManyCalledWith && updateManyCalledWith.filter.read === false);
        assert('POST /read-all sets read: true', updateManyCalledWith && updateManyCalledWith.update.$set && updateManyCalledWith.update.$set.read === true);
    }

    // --- summary ---
    console.log(`\n${passed} passed, ${failed} failed`);
    if (failed > 0) process.exit(1);
}

run().catch(err => { console.error(err); process.exit(1); });
