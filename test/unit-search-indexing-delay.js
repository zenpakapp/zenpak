/**
 * Unit test: "Public + Search engines" is accepted from a new account like from any other, and
 * nothing is said. Its public page only asks the search engines to stay away (noindex) until the
 * account is 7 days old, then it is indexed by itself.
 * Run with: node test/unit-search-indexing-delay.js
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

function ownerWithList(createdDaysAgo, visibility) {
    return {
        _id: daysAgo(createdDaysAgo),
        username: 'alice',
        syncToken: 1,
        emailVerified: true,
        library: {
            itemUnit: 'g',
            currencySymbol: '$',
            entitlements: { plan: 'free' },
            lists: [{
                id: 1, externalId: 'abc123', name: 'Trip', visibility, categoryIds: [1],
            }],
            categories: [{ id: 1, name: 'Shelter', categoryItems: [{ itemId: 1, qty: 1 }] }],
            items: [{ id: 1, name: 'Tent', weight: 900000 }],
        },
    };
}

const testUser = ownerWithList(0, 'private');
testUser.library = { entitlements: { plan: 'free' }, lists: [], items: [], categories: [] };
require.cache[require.resolve('../server/auth.js')] = {
    exports: { authenticateUser(req, res, cb) { cb(req, res, testUser); } },
    id: require.resolve('../server/auth.js'),
    filename: require.resolve('../server/auth.js'),
    loaded: true,
    children: [],
    paths: [],
};

const { buildPublicList } = require('../server/public-sharing.js');
const libraryRouter = require('../server/library-endpoints.js');

function save(visibility) {
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
    // Saving: nothing is refused and nothing is said, whatever the age of the account.
    testUser._id = daysAgo(0);
    const fresh = await save('indexable');
    assert.strictEqual(fresh.status, 200, 'a brand-new account can choose Public + Search engines');
    assert.ok(!fresh.data || !fresh.data.errors, 'and gets no message');

    // The public page of the list: noindex while the account is new, indexed once it is 7 days old.
    const flag = (days) => buildPublicList(ownerWithList(days, 'indexable'), 'abc123').list.allowSearchIndexing;
    assert.strictEqual(flag(1), false, 'a 1-day-old account is not indexed yet');
    assert.strictEqual(flag(6), false, 'nor at 6 days');
    assert.strictEqual(flag(7), true, 'at 7 days it is indexed, with no action from the member');
    assert.strictEqual(flag(400), true, 'an old account is indexed');

    // Only "Public + Search engines" is ever indexed; the delay changes nothing for the others.
    const other = (visibility, days) => buildPublicList(ownerWithList(days, visibility), 'abc123').list.allowSearchIndexing;
    assert.strictEqual(other('discoverable', 400), false, 'a discoverable list is not indexed');
    assert.strictEqual(other('shareable', 400), false, 'nor an unlisted one');

    // The delay can be turned off (the e2e suite does).
    process.env.INDEXING_DELAY_DAYS = '0';
    assert.strictEqual(flag(0), true, 'with the delay at 0 a new account is indexed at once');

    console.log('unit-search-indexing-delay OK');
    process.exit(0);
}
run().catch((e) => { console.error(e); process.exit(1); });
