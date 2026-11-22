'use strict';

// POST /follow/:username is limited per member: a loop over accounts would alert all of them.

const { ObjectId } = require('mongodb');

const member = { _id: new ObjectId(), username: 'alice' };
const target = { _id: new ObjectId(), username: 'bob' };
let saved = 0;
let notified = 0;

const dbStub = {
    users: { findOne() { return Promise.resolve(target); } },
    follows: {
        save() { saved += 1; return Promise.resolve(); },
        findOne() { return Promise.resolve(null); },
    },
};
require.cache[require.resolve('../server/db.js')] = {
    exports: dbStub, id: require.resolve('../server/db.js'),
    filename: require.resolve('../server/db.js'), loaded: true, children: [], paths: [],
};
require.cache[require.resolve('../server/auth.js')] = {
    exports: { authenticateUser(req, res, cb) { cb(req, res, member); } },
    id: require.resolve('../server/auth.js'),
    filename: require.resolve('../server/auth.js'), loaded: true, children: [], paths: [],
};
require.cache[require.resolve('../server/notifications.js')] = {
    exports: { createNotification() { notified += 1; return Promise.resolve(); } },
    id: require.resolve('../server/notifications.js'),
    filename: require.resolve('../server/notifications.js'), loaded: true, children: [], paths: [],
};
require.cache[require.resolve('../server/feed-events.js')] = {
    exports: { getFeedForUser: async () => ({ events: [], nextCursor: null }) },
    id: require.resolve('../server/feed-events.js'),
    filename: require.resolve('../server/feed-events.js'), loaded: true, children: [], paths: [],
};

const router = require('../server/community-endpoints.js');

let passed = 0;
let failed = 0;
function assert(desc, cond) {
    if (cond) { console.log(`  PASS  ${desc}`); passed++; } else { console.error(`  FAIL  ${desc}`); failed++; }
}

function follow() {
    const route = router.stack.find((l) => l.route && l.route.path === '/follow/:username' && l.route.methods.post);
    return new Promise((resolve) => {
        const res = {
            code: 200,
            status(c) { this.code = c; return this; },
            set() { return this; },
            json(data) { resolve({ status: this.code, data }); },
        };
        route.route.stack[0].handle({ params: { username: 'bob' }, body: {} }, res);
    });
}

async function run() {
    let firstRefused = 0;
    for (let i = 1; i <= 70; i++) {
        const { status } = await follow();
        if (status === 429 && !firstRefused) firstRefused = i;
    }
    assert('the 61st follow of an hour is refused with 429', firstRefused === 61);
    assert('a refused follow saves nothing', saved === 60);
    assert('a refused follow notifies nobody', notified === 60);

    console.log(`\n${passed} passed, ${failed} failed`);
    process.exit(failed > 0 ? 1 : 0);
}
run().catch((e) => { console.error(e); process.exit(1); });
