/**
 * Unit test: the internal qtyBeforeOptional bookkeeping field (see
 * client/models/category.js Category.prototype.toggleOptionalItem) must
 * never leak into CSV export or the public-sharing payload.
 * Run with: node test/unit-optional-item-export-exclusion.js
 */

'use strict';

let passed = 0;
let failed = 0;

function assert(description, condition) {
    if (condition) {
        console.log(`  PASS  ${description}`);
        passed++;
    } else {
        console.error(`  FAIL  ${description}`);
        failed++;
    }
}

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
                publicFields: { downloadable: true, price: true },
            }],
            categories: [{
                id: 'cat-1',
                name: 'Category',
                categoryItems: [
                    { itemId: 'item-1', qty: 0, qtyBeforeOptional: 3, worn: false, consumable: false, star: 0 },
                ],
            }],
            items: [
                { id: 'item-1', name: 'Optional Item', weight: 500000, price: 10 },
            ],
        },
    };
}

console.log('\n--- CSV export (server/views.js GET /csv/:id) omits qtyBeforeOptional ---');

require.cache[require.resolve('../server/db.js')] = {
    exports: {
        users: {
            findOne(query, callback) { callback(null, fixtureUser()); },
        },
    },
    id: require.resolve('../server/db.js'),
    filename: require.resolve('../server/db.js'),
    loaded: true,
    children: [],
    paths: [],
};

async function runCsvTest() {
    const router = require('../server/views.js');
    const route = router.stack.find((layer) => layer.route && layer.route.path === '/csv/:id' && layer.route.methods.get);
    assert('csv route exists', Boolean(route));

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

    assert('csv body was generated', typeof body === 'string' && body.length > 0);
    assert('csv contains the item name (sanity check the fixture was used)', body.includes('Optional Item'));
    assert('csv does not contain qtyBeforeOptional', !body.includes('qtyBeforeOptional'));
}

console.log('\n--- public-sharing buildPublicList omits qtyBeforeOptional ---');

function runSharingTest() {
    delete require.cache[require.resolve('../server/public-sharing.js')];
    const { buildPublicList } = require('../server/public-sharing.js');

    const publicList = buildPublicList(fixtureUser(), 'ext-1');
    assert('public list was built', Boolean(publicList));

    const serialized = JSON.stringify(publicList);
    assert('public payload does not contain qtyBeforeOptional', !serialized.includes('qtyBeforeOptional'));

    const item = publicList.categories[0].items[0];
    assert('public item is still correctly marked qty 0', item.qty === 0);
}

runCsvTest()
    .then(() => {
        runSharingTest();
        console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
        process.exit(failed > 0 ? 1 : 0);
    })
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
