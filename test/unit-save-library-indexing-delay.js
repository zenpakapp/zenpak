/**
 * Unit test: a brand-new account cannot yet make a list "indexable" (listed by search engines);
 * the other visibilities and an older account are not affected.
 * Run with: node test/unit-save-library-indexing-delay.js
 */

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
delete process.env.INDEXING_DELAY_DAYS;

const assert = require('assert');
const { ObjectId } = require('mongodb');

const db = require('../server/db.js');

db.users.updateOne = () => Promise.resolve({ matchedCount: 1 });

const daysAgo = (days) => new ObjectId(Math.floor((Date.now() - days * 86400000) / 1000));
const testUser = {
    _id: daysAgo(0),
    username: 'alice',
    syncToken: 1,
    emailVerified: true,
    library: { entitlements: { plan: 'free' }, lists: [], items: [], categories: [] },
};

require.cache[require.resolve('../server/auth.js')] = {
    exports: { authenticateUser(req, res, cb) { cb(req, res, testUser); } },
    id: require.resolve('../server/auth.js'),
    filename: require.resolve('../server/auth.js'),
    loaded: true,
    children: [],
    paths: [],
};

const libraryRouter = require('../server/library-endpoints.js');

async function save(visibility) {
    testUser.syncToken = 1;
    testUser.library.lists = [];
    const layer = libraryRouter.stack.find((l) => l.route && l.route.path === '/saveLibrary' && l.route.methods.post);
    const body = {
        username: 'alice',
        syncToken: 1,
        data: JSON.stringify({ lists: [{ id: 1, name: 'Trip', visibility }], items: [], categories: [] }),
    };
    return new Promise((resolve) => {
        const res = {
            statusCode: 200,
            status(code) { this.statusCode = code; return this; },
            json(data) { resolve({ status: this.statusCode, data }); },
            send(data) { resolve({ status: this.statusCode, data }); },
        };
        layer.route.stack[0].handle({ body }, res);
    });
}

async function run() {
    testUser._id = daysAgo(1);
    const tooNew = await save('indexable');
    assert.strictEqual(tooNew.status, 403, 'a one-day-old account cannot list for search');
    assert.strictEqual(tooNew.data.code, 'account-too-new');
    assert.strictEqual(tooNew.data.days, 7);

    const discoverable = await save('discoverable');
    assert.strictEqual(discoverable.status, 200, 'a new account can still make a list discoverable');
    const unlisted = await save('shareable');
    assert.strictEqual(unlisted.status, 200, 'and shareable');

    testUser._id = daysAgo(8);
    const old = await save('indexable');
    assert.strictEqual(old.status, 200, 'an account older than 7 days can list for search');

    // A list already indexable keeps its place while the account is new (nothing is escalated).
    testUser._id = daysAgo(1);
    testUser.library.lists = [{ id: 1, name: 'Trip', visibility: 'indexable' }];
    testUser.syncToken = 1;
    const layer = libraryRouter.stack.find((l) => l.route && l.route.path === '/saveLibrary' && l.route.methods.post);
    const kept = await new Promise((resolve) => {
        const res = {
            statusCode: 200,
            status(code) { this.statusCode = code; return this; },
            json(data) { resolve({ status: this.statusCode, data }); },
            send(data) { resolve({ status: this.statusCode, data }); },
        };
        layer.route.stack[0].handle({
            body: { username: 'alice', syncToken: 1, data: JSON.stringify({ lists: [{ id: 1, name: 'Trip', visibility: 'indexable' }], items: [], categories: [] }) },
        }, res);
    });
    assert.strictEqual(kept.status, 200, 'a list that is already indexable is not refused again');

    process.env.INDEXING_DELAY_DAYS = '0';
    testUser._id = daysAgo(0);
    const noDelay = await save('indexable');
    assert.strictEqual(noDelay.status, 200, 'with the delay at 0 a new account can list for search');

    console.log('unit-save-library-indexing-delay OK');
    process.exit(0);
}
run().catch((e) => { console.error(e); process.exit(1); });
