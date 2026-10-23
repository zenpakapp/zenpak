/**
 * Unit test: saving a library cuts a list description to 1000 characters, so the stored text,
 * the CSV export, copies and version comparisons are bounded like what the public sees.
 * Run with: node test/unit-save-library-description-limit.js
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

const assert = require('assert');

const db = require('../server/db.js');

let savedUser = null;
db.users.updateOne = (filter, update) => { savedUser = { library: update.$set.library }; return Promise.resolve({ matchedCount: 1 }); };

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

require.cache[require.resolve('../server/auth.js')] = {
    exports: { authenticateUser(req, res, cb) { cb(req, res, testUser); } },
    id: require.resolve('../server/auth.js'),
    filename: require.resolve('../server/auth.js'),
    loaded: true,
    children: [],
    paths: [],
};

const libraryRouter = require('../server/library-endpoints.js');

async function save(lists) {
    testUser.syncToken = 1;
    const layer = libraryRouter.stack.find((l) => l.route && l.route.path === '/saveLibrary' && l.route.methods.post);
    const body = {
        username: 'alice',
        syncToken: 1,
        data: JSON.stringify({ lists, items: [], categories: [] }),
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
    const long = `${'word '.repeat(600)}END`;

    const result = await save([
        { id: 1, name: 'Long', description: long, summary: long },
        { id: 2, name: 'Short', description: 'A description', summary: '' },
        { id: 3, name: 'None' },
    ]);
    assert.strictEqual(result.status, 200);

    const [longList, shortList, noneList] = savedUser.library.lists;
    assert.strictEqual(longList.description.length, 1000, 'a long description is cut');
    assert.ok(long.startsWith(longList.description), 'cut at the end, not reworded');
    assert.strictEqual(longList.summary.length, 1000, 'so is a long summary');
    assert.strictEqual(shortList.description, 'A description', 'a short one is left alone');
    assert.strictEqual(shortList.summary, '');
    assert.ok(!('description' in noneList), 'a list with no description gains none');

    // Exactly at the limit: untouched.
    const exact = 'a'.repeat(1000);
    await save([{ id: 1, name: 'Exact', description: exact }]);
    assert.strictEqual(savedUser.library.lists[0].description, exact);

    // Never more than one line break in a row, and none at the ends.
    await save([{ id: 1, name: 'Breaks', description: `\n\nfirst${'\n'.repeat(50)}second\r\n\r\nthird\n\n` }]);
    assert.strictEqual(savedUser.library.lists[0].description, 'first\n\nsecond\n\nthird');

    console.log('ok');
    process.exit(0);
}

run().catch((err) => { console.error(err); process.exit(1); });
