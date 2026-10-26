/**
 * Unit test: deleting an account destroys its item photos at the image host, except those another
 * account still shows (a copy of one of its lists keeps the address of the original photo, in its
 * library or in a version it published). Profile photos and foreign images are never touched here,
 * and one failing photo does not stop the others.
 * Run with: node test/unit-item-image-cleanup.js
 */

'use strict';

process.env.NODE_CONFIG = JSON.stringify({
    environment: 'test',
    cloudinaryCloudName: 'demo-cloud',
    cloudinaryApiKey: 'demo-key',
    cloudinaryApiSecret: 'demo-secret',
});

const assert = require('assert');
const { ObjectId } = require('mongodb');
const { stubServerModule } = require('./fixtures/list-versions-fixtures.js');

const base = 'https://res.cloudinary.com/demo-cloud/image/upload/v1/lighterpack';
const owner = new ObjectId();
const queries = [];
let sharedInLibrary = [];
let sharedInVersion = [];
stubServerModule('db.js', {
    users: {
        findOne(query) {
            queries.push(['users', query]);
            const pattern = query['library.items'].$elemMatch.imageUrl;
            return Promise.resolve(sharedInLibrary.some((url) => pattern.test(url)) ? { _id: new ObjectId() } : null);
        },
    },
    listVersions: {
        findOne(query) {
            queries.push(['listVersions', query]);
            const pattern = query['library.items'].$elemMatch.imageUrl;
            return Promise.resolve(sharedInVersion.some((url) => pattern.test(url)) ? { _id: new ObjectId() } : null);
        },
    },
});

const realFetch = global.fetch;
const requests = [];
let refuse = '';
global.fetch = async (url, options) => {
    const fields = {};
    options.body.forEach((value, key) => { fields[key] = value; });
    requests.push(fields.public_id);
    if (fields.public_id === refuse) return { ok: false, status: 400, json: async () => ({ error: { message: 'nope' } }) };
    return { ok: true, status: 200, json: async () => ({ result: 'ok' }) };
};

const { eraseUnsharedItemImages } = require('../server/item-image-cleanup.js');

const user = {
    _id: owner,
    library: {
        items: [
            { imageUrl: `${base}/alone.jpg` },
            { imageUrl: `${base}/alone.jpg` },
            { imageUrl: `${base}/copied.jpg` },
            { imageUrl: `${base}/versioned.jpg` },
            { imageUrl: `${base}/broken.jpg` },
            { imageUrl: `${base}/after.jpg` },
            { imageUrl: `${base}/avatars/photo.png` },
            { imageUrl: 'https://example.com/tent.jpg' },
            { imageUrl: '' },
            {},
        ],
    },
};

(async () => {
    sharedInLibrary = [`${base}/copied.jpg`];
    sharedInVersion = [`${base}/versioned.jpg`];
    refuse = 'lighterpack/broken';
    const errors = [];

    const count = await eraseUnsharedItemImages(user, (err) => errors.push(err.message));

    assert.deepStrictEqual(requests, ['lighterpack/alone', 'lighterpack/broken', 'lighterpack/after'], 'only unshared item photos, once each');
    assert.strictEqual(count, 2, 'two destroyed, the failing one is not counted');
    assert.strictEqual(errors.length, 1, 'the refusal is reported');
    assert.ok(/nope/.test(errors[0]));

    // The lookup never counts the deleted account itself.
    assert.ok(queries.every(([, query]) => (query._id || query.ownerId).$ne === owner));

    // Nothing to destroy: no lookup, no request.
    requests.length = 0;
    queries.length = 0;
    assert.strictEqual(await eraseUnsharedItemImages({ _id: owner, library: {} }), 0);
    assert.strictEqual(requests.length + queries.length, 0);

    global.fetch = realFetch;
    console.log('unit-item-image-cleanup: ok');
    process.exit(0);
})().catch((err) => { console.error(err); process.exit(1); });
