/**
 * Unit test: the public CSV export follows the list's share settings for price, links and images,
 * while the owner keeps a complete file of their own list.
 * Run with: node test/unit-csv-public-fields.js
 */

'use strict';

const assert = require('assert');

let fields = {};
function fixtureUser() {
    return {
        _id: 'user-1',
        library: {
            version: '0.3',
            itemUnit: 'g',
            optionalFields: { worn: true, consumable: true, price: true, images: true },
            lists: [{
                id: 'list-1',
                externalId: 'ext-1',
                name: 'Test list',
                visibility: 'shareable',
                categoryIds: ['cat-1'],
                publicFields: fields,
            }],
            categories: [{
                id: 'cat-1',
                name: 'Category',
                categoryItems: [{ itemId: 'item-1', qty: 1, worn: false, consumable: false, star: 0 }],
            }],
            items: [{
                id: 'item-1',
                name: 'Tent',
                weight: 900000,
                price: 4321,
                url: 'https://shop.example/tent',
                imageUrl: 'https://img.example/tent.jpg',
                brand: 'Acme',
            }],
        },
    };
}

let publishedSnapshot = null;
// The db.js stub must be installed before list-versions.js is first required.
require.cache[require.resolve('../server/db.js')] = {
    exports: {
        users: {
            findOne(query, callback) {
                const user = fixtureUser();
                if (callback) { callback(null, user); return undefined; }
                return Promise.resolve(user);
            },
        },
        listVersions: {
            findSorted(query) {
                return Promise.resolve(query.externalId === 'ext-1' && publishedSnapshot ? [publishedSnapshot] : []);
            },
        },
    },
    id: require.resolve('../server/db.js'),
    filename: require.resolve('../server/db.js'),
    loaded: true,
    children: [],
    paths: [],
};

const { buildFrozenLibrary } = require('../server/list-versions.js');

function publish() {
    const owner = fixtureUser();
    publishedSnapshot = {
        externalId: 'ext-1',
        version: 1,
        ownerId: owner._id,
        library: buildFrozenLibrary(owner.library, 'ext-1'),
    };
}

// The stubbed findOne returns the list owner for any token, so a cookie means "the owner".
async function exportCsv(cookies) {
    const router = require('../server/views.js');
    const route = router.stack.find((layer) => layer.route && layer.route.path === '/csv/:id' && layer.route.methods.get);
    let body = null;
    await new Promise((resolve) => {
        const req = { params: { id: 'ext-1' }, cookies };
        const res = {
            setHeader() {},
            status() { return this; },
            send(data) { body = data; resolve(); },
        };
        route.route.stack[0].handle(req, res);
    });
    return body;
}

function tentRow(body) {
    const cells = body.split('\n').find((line) => line.startsWith('Tent,')).split(',');
    return { url: cells[6], price: cells[7], brand: cells[10], image: cells[11] };
}

(async () => {
    // Downloadable, nothing else allowed: a visitor gets the gear but no price, link or image.
    fields = { downloadable: true };
    publish();
    let row = tentRow(await exportCsv({}));
    assert.deepStrictEqual(row, { url: '', price: '', brand: 'Acme', image: '' }, 'a visitor gets no price, link or image');

    // Each case opens its own column.
    fields = { downloadable: true, price: true };
    publish();
    row = tentRow(await exportCsv({}));
    assert.strictEqual(row.price, '4321');
    assert.strictEqual(row.url, '');
    assert.strictEqual(row.image, '');

    fields = { downloadable: true, links: true };
    publish();
    row = tentRow(await exportCsv({}));
    assert.strictEqual(row.url, 'https://shop.example/tent');
    assert.strictEqual(row.price, '');

    fields = { downloadable: true, images: true };
    publish();
    row = tentRow(await exportCsv({}));
    assert.strictEqual(row.image, 'https://img.example/tent.jpg');
    assert.strictEqual(row.url, '');

    fields = { downloadable: true, price: true, links: true, images: true };
    publish();
    row = tentRow(await exportCsv({}));
    assert.deepStrictEqual(row, {
        url: 'https://shop.example/tent', price: '4321', brand: 'Acme', image: 'https://img.example/tent.jpg',
    }, 'everything allowed: the full file');

    // The owner keeps a complete file, whatever the share settings say.
    fields = { downloadable: true };
    publish();
    row = tentRow(await exportCsv({ lp: 'owner-token' }));
    assert.deepStrictEqual(row, {
        url: 'https://shop.example/tent', price: '4321', brand: 'Acme', image: 'https://img.example/tent.jpg',
    }, 'the owner gets their complete list');

    console.log('unit-csv-public-fields OK');
})().catch((err) => { console.error(err); process.exit(1); });
