'use strict';

process.env.NODE_CONFIG = JSON.stringify({
    environment: 'test',
    stripeSecretKey: '',
    stripeWebhookSecret: '',
    stripePriceIdTrail: '',
    stripePriceIdTrailAnnual: '',
    stripePriceIdGuide: '',
    stripePriceIdGuideAnnual: '',
    kofiWebhookToken: '',
    databaseUrl: 'localhost/test',
    deployUrl: 'http://localhost:3000',
});

const db = require('../server/db.js');
db.users.save = (user, cb) => { savedUser = user; cb(); };
let savedUser = null;

const testUser = {
    _id: 'user1',
    username: 'alice',
    syncToken: 1,
    emailVerified: true,
    library: {
        entitlements: { plan: 'free' },
        lists: [],
        items: [],
        categories: [],
    },
};

const authStub = {
    authenticateUser(req, res, cb) { cb(req, res, testUser); },
};
require.cache[require.resolve('../server/auth.js')] = {
    exports: authStub, id: require.resolve('../server/auth.js'),
    filename: require.resolve('../server/auth.js'), loaded: true, children: [], paths: [],
};

const libraryRouter = require('../server/library-endpoints.js');

let passed = 0; let failed = 0;
function assert(desc, cond) {
    if (cond) { console.log(`  PASS  ${desc}`); passed++; }
    else { console.error(`  FAIL  ${desc}`); failed++; }
}

async function callSaveLibrary(body) {
    const layer = libraryRouter.stack.find(l => l.route && l.route.path === '/saveLibrary' && l.route.methods.post);
    const req = { body };
    return new Promise(resolve => {
        const res = {
            _status: 200,
            status(code) { this._status = code; return this; },
            json(data) { resolve({ status: this._status, data }); },
            send(data) { resolve({ status: this._status, data }); },
        };
        layer.route.stack[0].handle(req, res);
    });
}

async function run() {
    console.log('\n--- Auto-attribution guard ---');

    const maliciousPayload = JSON.stringify({
        lists: [],
        items: [],
        categories: [],
        entitlements: { plan: 'creator' }, // attacker tries to self-grant Wayfarer
    });

    const result = await callSaveLibrary({
        username: 'alice',
        syncToken: 1,
        data: maliciousPayload,
    });

    assert('save succeeds (200)', result.status === 200);
    assert('client-supplied entitlements.plan is discarded, not applied', savedUser.library.entitlements.plan === 'free');
    assert('server entitlements object is the pre-save one, not the client one', savedUser.library.entitlements.plan !== 'creator');

    console.log(`\n${passed} passed, ${failed} failed`);
    process.exit(failed > 0 ? 1 : 0);
}
run().catch(e => { console.error(e); process.exit(1); });
