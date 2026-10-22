/**
 * Unit test: a public CSV download is counted for the ZenPak figures (csvDownloadCount), and the
 * list owner never sees that number.
 * Run with: node test/unit-csv-download-count.js
 */

'use strict';

process.env.NODE_CONFIG = JSON.stringify({
    environment: 'test',
    stripeSecretKey: '',
    stripeWebhookSecret: '',
    kofiWebhookToken: '',
    databaseUrl: 'localhost/test',
    deployUrl: 'http://localhost:3000',
});

const assert = require('assert');
const { stubServerModule } = require('./fixtures/list-versions-fixtures.js');

const owner = {
    _id: 'user-1',
    username: 'alice',
    token: 'owner-token',
    library: {
        version: '0.3',
        itemUnit: 'g',
        lists: [{
            id: 'list-1',
            externalId: 'ext-1',
            name: 'Test list',
            visibility: 'shareable',
            categoryIds: ['cat-1'],
            publicFields: { downloadable: true },
        }],
        categories: [{ id: 'cat-1', name: 'Category', categoryItems: [{ itemId: 'item-1', qty: 1 }] }],
        items: [{ id: 'item-1', name: 'Tent', weight: 500000, price: 10 }],
    },
};

let snapshot = null;
const counted = [];
stubServerModule('db.js', {
    users: {
        findOne(query, callback) {
            const user = query.token === 'owner-token' || query._id === 'user-1' ? owner : null;
            if (callback) { callback(null, user); return undefined; }
            return Promise.resolve(user);
        },
    },
    listVersions: {
        findSorted(query) { return Promise.resolve(query.externalId === 'ext-1' && snapshot ? [snapshot] : []); },
    },
    publicListStats: {
        updateOne(filter, update) { counted.push([filter.externalId, update.$inc]); return Promise.resolve(); },
    },
});

const { buildFrozenLibrary } = require('../server/list-versions.js');
const router = require('../server/views.js');

function download(cookies = {}) {
    const layer = router.stack.find((l) => l.route && l.route.path === '/csv/:id' && l.route.methods.get);
    assert.ok(layer, 'csv route exists');
    return new Promise((resolve) => {
        const res = {
            statusCode: 200,
            setHeader() {},
            status(code) { this.statusCode = code; return this; },
            send(body) { resolve({ status: this.statusCode, body }); },
        };
        layer.route.stack[0].handle({ params: { id: 'ext-1' }, cookies }, res);
    }).then(async (result) => {
        await new Promise((r) => setImmediate(r));
        return result;
    });
}

(async () => {
    snapshot = {
        externalId: 'ext-1', version: 1, ownerId: owner._id, library: buildFrozenLibrary(owner.library, 'ext-1'),
    };

    // A public download is counted.
    let result = await download();
    assert.strictEqual(result.status, 200);
    assert.ok(result.body.includes('Tent'));
    assert.deepStrictEqual(counted, [['ext-1', { csvDownloadCount: 1 }]]);

    // A list that does not allow downloads gives nothing and counts nothing.
    owner.library.lists[0].publicFields.downloadable = false;
    snapshot.library = buildFrozenLibrary(owner.library, 'ext-1');
    counted.length = 0;
    result = await download();
    assert.strictEqual(result.status, 403);
    assert.strictEqual(counted.length, 0);

    console.log('unit-csv-download-count: ok');
    process.exit(0);
})().catch((err) => { console.error(err); process.exit(1); });
