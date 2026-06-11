'use strict';

const { ObjectId } = require('mongodb');

const guideUser = {
    _id: new ObjectId(),
    username: 'alice',
    library: {
        entitlements: { plan: 'creator' },
        publicProfile: {
            bio: 'Old bio',
            links: [],
            gearPhilosophy: [],
        },
        creator: {
            affiliateRules: [],
            disclosure: '',
        },
        lists: [
            {
                id: 'list1',
                externalId: 'abc123',
                name: 'PCT Section J',
                visibility: 'discoverable',
                categories: [
                    {
                        items: [
                            { id: 'item1', name: 'Arc Haul', brand: 'Zpacks', affiliateUrl: '', promoCode: '', promoLabel: '' },
                            { id: 'item2', name: 'Rain Jacket', brand: 'Outdoor Research', affiliateUrl: '', promoCode: '', promoLabel: '' },
                        ],
                    },
                ],
            },
            {
                id: 'list2',
                externalId: 'def456',
                name: 'Private List',
                visibility: 'private',
                categories: [
                    { items: [{ id: 'item3', name: 'Hidden item', brand: '', affiliateUrl: '', promoCode: '', promoLabel: '' }] },
                ],
            },
        ],
    },
};

const baseUser = {
    _id: new ObjectId(),
    username: 'bob',
    library: { entitlements: { plan: 'free' }, lists: [] },
};

let savedUser = null;
const dbStub = {
    users: {
        findOne() { return Promise.resolve(guideUser); },
        save(user, cb) { savedUser = user; if (cb) cb(null); return Promise.resolve(); },
    },
};
require.cache[require.resolve('../server/db.js')] = {
    exports: dbStub, id: require.resolve('../server/db.js'),
    filename: require.resolve('../server/db.js'), loaded: true, children: [], paths: [],
};

const authStub = { authenticateUser(req, res, cb) { cb(req, res, guideUser); } };
require.cache[require.resolve('../server/auth.js')] = {
    exports: authStub, id: require.resolve('../server/auth.js'),
    filename: require.resolve('../server/auth.js'), loaded: true, children: [], paths: [],
};

const router = require('../server/guide-endpoints.js');

let passed = 0; let failed = 0;
function assert(desc, cond) {
    if (cond) { console.log(`  PASS  ${desc}`); passed++; }
    else { console.error(`  FAIL  ${desc}`); failed++; }
}

function makeRes(resolve) {
    const res = {
        _status: 200,
        status(code) { this._status = code; return this; },
        json(data) { resolve({ status: res._status, data }); },
    };
    return res;
}

async function callRoute(method, path, body = {}) {
    const route = router.stack.find(l => l.route && l.route.path === path && l.route.methods[method]);
    if (!route) return null;
    const req = { params: {}, query: {}, body };
    return new Promise(resolve => {
        route.route.stack[0].handle(req, makeRes(resolve));
    });
}

async function run() {
    // PUT /profile
    assert('PUT /profile route exists', Boolean(router.stack.find(l => l.route && l.route.path === '/profile' && l.route.methods.put)));

    savedUser = null;
    const profileResult = await callRoute('put', '/profile', {
        bio: 'New bio',
        links: [{ label: 'Blog', url: 'https://example.com' }],
        gearPhilosophy: ['Ultralight first'],
    });
    assert('PUT /profile returns 200', profileResult && profileResult.status === 200);
    assert('PUT /profile saves bio', savedUser && savedUser.library.publicProfile.bio === 'New bio');
    assert('PUT /profile saves links', savedUser && savedUser.library.publicProfile.links.length === 1);
    assert('PUT /profile saves gearPhilosophy', savedUser && savedUser.library.publicProfile.gearPhilosophy[0] === 'Ultralight first');

    // non-guide blocked from PUT /profile
    const origAuth = authStub.authenticateUser;
    authStub.authenticateUser = (req, res, cb) => cb(req, res, baseUser);
    const profileForbidden = await callRoute('put', '/profile', { bio: 'x' });
    assert('PUT /profile returns 403 for non-guide', profileForbidden && profileForbidden.status === 403);
    authStub.authenticateUser = origAuth;

    // PUT /affiliate-rules
    assert('PUT /affiliate-rules route exists', Boolean(router.stack.find(l => l.route && l.route.path === '/affiliate-rules' && l.route.methods.put)));

    savedUser = null;
    const rulesResult = await callRoute('put', '/affiliate-rules', {
        affiliateRules: [{ type: 'brand', match: 'Zpacks', affiliateUrl: 'https://zpacks.com/?ref=alice', promoCode: 'ALICE10', promoLabel: '10% off' }],
        disclosure: 'Some links are affiliate links.',
    });
    assert('PUT /affiliate-rules returns 200', rulesResult && rulesResult.status === 200);
    assert('PUT /affiliate-rules saves rules', savedUser && savedUser.library.creator.affiliateRules.length === 1);
    assert('PUT /affiliate-rules saves disclosure', savedUser && savedUser.library.creator.disclosure === 'Some links are affiliate links.');

    // GET /items
    assert('GET /items route exists', Boolean(router.stack.find(l => l.route && l.route.path === '/items' && l.route.methods.get)));

    const itemsResult = await callRoute('get', '/items');
    assert('GET /items returns 200', itemsResult && itemsResult.status === 200);
    assert('GET /items returns array', itemsResult && Array.isArray(itemsResult.data));
    assert('GET /items only includes public lists', itemsResult && itemsResult.data.length === 1);
    assert('GET /items public list has correct name', itemsResult && itemsResult.data[0].listName === 'PCT Section J');
    assert('GET /items public list has 2 items', itemsResult && itemsResult.data[0].items.length === 2);
    assert('GET /items item has correct fields', itemsResult && itemsResult.data[0].items[0].name === 'Arc Haul');

    // PUT /items
    assert('PUT /items route exists', Boolean(router.stack.find(l => l.route && l.route.path === '/items' && l.route.methods.put)));

    savedUser = null;
    const itemsUpdateResult = await callRoute('put', '/items', [
        { listId: 'list1', itemId: 'item1', affiliateUrl: 'https://zpacks.com/?ref=alice', promoCode: 'ALICE10', promoLabel: '10% off' },
    ]);
    assert('PUT /items returns 200', itemsUpdateResult && itemsUpdateResult.status === 200);
    assert('PUT /items updates item affiliateUrl', savedUser && savedUser.library.lists[0].categories[0].items[0].affiliateUrl === 'https://zpacks.com/?ref=alice');
    assert('PUT /items updates item promoCode', savedUser && savedUser.library.lists[0].categories[0].items[0].promoCode === 'ALICE10');
    assert('PUT /items does not touch other items', savedUser && savedUser.library.lists[0].categories[0].items[1].promoCode === '');

    console.log(`\n${passed} passed, ${failed} failed`);
    process.exit(failed > 0 ? 1 : 0);
}
run().catch(e => { console.error(e); process.exit(1); });
