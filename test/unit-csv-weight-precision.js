/**
 * Unit test: the CSV export keeps light items visible. In kg a 4 g item used to be exported
 * as 0 and a 28.349 g item as 0.03, so re-importing the file lost the real weights.
 * Run with: node test/unit-csv-weight-precision.js
 */

'use strict';

const assert = require('assert');

function fixtureUser() {
    return {
        _id: 'user-1',
        library: {
            version: '0.3',
            itemUnit: 'kg',
            optionalFields: { worn: true, consumable: true, price: true, images: true },
            lists: [{
                id: 'list-1',
                externalId: 'ext-1',
                name: 'Test list',
                visibility: 'shareable',
                categoryIds: ['cat-1'],
                publicFields: { downloadable: true, price: true },
            }],
            categories: [{
                id: 'cat-1',
                name: 'Category',
                categoryItems: [
                    { itemId: 'item-1', qty: 1, worn: false, consumable: false, star: 0 },
                    { itemId: 'item-2', qty: 1, worn: false, consumable: false, star: 0 },
                    { itemId: 'item-3', qty: 1, worn: false, consumable: false, star: 0 },
                ],
            }],
            items: [
                { id: 'item-1', name: 'Spork', weight: 4000, price: 1 },
                { id: 'item-2', name: 'Bag', weight: 28349, price: 1 },
                { id: 'item-3', name: 'Tent', weight: 1500000, price: 1 },
            ],
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

const owner = fixtureUser();
publishedSnapshot = {
    externalId: 'ext-1',
    version: 1,
    ownerId: owner._id,
    library: buildFrozenLibrary(owner.library, 'ext-1'),
};

async function exportCsv() {
    const router = require('../server/views.js');
    const route = router.stack.find((layer) => layer.route && layer.route.path === '/csv/:id' && layer.route.methods.get);
    let body = null;
    await new Promise((resolve) => {
        const req = { params: { id: 'ext-1' }, cookies: {} };
        const res = {
            setHeader() {},
            status() { return this; },
            send(data) { body = data; resolve(); },
        };
        route.route.stack[0].handle(req, res);
    });
    return body;
}

exportCsv()
    .then((body) => {
        const rows = Object.fromEntries(body.split('\n').slice(1).filter(Boolean).map((line) => {
            const cells = line.split(',');
            return [cells[0], { weight: cells[4], unit: cells[5] }];
        }));
        assert.deepStrictEqual(rows.Spork, { weight: '0.004', unit: 'kilogram' });
        assert.deepStrictEqual(rows.Bag, { weight: '0.028', unit: 'kilogram' });
        assert.deepStrictEqual(rows.Tent, { weight: '1.5', unit: 'kilogram' });
        console.log('ok');
        process.exit(0);
    })
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
