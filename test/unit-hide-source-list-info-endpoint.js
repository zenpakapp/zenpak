'use strict';

const ownerUser = {
    username: 'alice',
    syncToken: 4,
    library: {
        lists: [{
            id: 'list-1',
            name: 'Copied list',
            categoryIds: ['cat-1'],
            sourceListInfoHidden: false,
        }],
        categories: [{
            id: 'cat-1',
            categoryItems: [
                { itemId: 'item-1', qty: 1 },
                { itemId: 'item-2', qty: 1 },
            ],
        }],
        items: [
            { id: 'item-1', name: 'Pack', url: 'https://example.com/pack', affiliateUrl: 'https://example.com/pack?ref=a', promoCode: 'ALICE10', promoLabel: '10% off' },
            { id: 'item-2', name: 'Bottle', url: 'https://example.com/bottle', affiliateUrl: '', promoCode: '', promoLabel: '' },
        ],
    },
};

let savedUser = null;

require.cache[require.resolve('../server/db.js')] = {
    exports: {
        users: {
            save(user, cb) {
                savedUser = user;
                if (cb) cb();
                return Promise.resolve(user);
            },
        },
    },
    id: require.resolve('../server/db.js'),
    filename: require.resolve('../server/db.js'),
    loaded: true,
    children: [],
    paths: [],
};

require.cache[require.resolve('../server/auth.js')] = {
    exports: {
        authenticateUser(req, res, cb) { cb(req, res, ownerUser); },
    },
    id: require.resolve('../server/auth.js'),
    filename: require.resolve('../server/auth.js'),
    loaded: true,
    children: [],
    paths: [],
};

require.cache[require.resolve('../server/public-list-projections.js')] = {
    exports: {
        syncUserPublicLists: async () => {},
    },
    id: require.resolve('../server/public-list-projections.js'),
    filename: require.resolve('../server/public-list-projections.js'),
    loaded: true,
    children: [],
    paths: [],
};

const router = require('../server/library-endpoints.js');

let passed = 0;
let failed = 0;
function assert(desc, cond) {
    if (cond) { console.log(`  PASS  ${desc}`); passed++; }
    else { console.error(`  FAIL  ${desc}`); failed++; }
}

async function run() {
    const route = router.stack.find(layer => layer.route && layer.route.path === '/api/lists/:listId/hide-source-list-info' && layer.route.methods.post);
    assert('route exists', Boolean(route));

    let responseData = null;
    let statusCode = 200;
    await new Promise((resolve) => {
        const req = { params: { listId: 'list-1' } };
        const res = {
            status(code) { statusCode = code; return this; },
            json(data) { responseData = data; resolve(); },
        };
        route.route.stack[0].handle(req, res);
    });

    assert('returns 200', statusCode === 200);
    assert('returns count of changed items', responseData && responseData.count === 1);
    assert('increments sync token', responseData && responseData.syncToken === 5);
    assert('marks source list info hidden', savedUser.library.lists[0].sourceListInfoHidden === true);
    assert('clears affiliate URL', savedUser.library.items[0].affiliateUrl === '');
    assert('clears promo code', savedUser.library.items[0].promoCode === '');
    assert('keeps main URL', savedUser.library.items[0].url === 'https://example.com/pack');

    console.log(`\n${passed} passed, ${failed} failed`);
    process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
    console.error(err);
    process.exit(1);
});
