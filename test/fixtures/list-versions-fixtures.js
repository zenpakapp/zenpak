'use strict';

const path = require('path');
const { ObjectId } = require('mongodb');

// Install a stub for a module under server/ before the code under test requires it.
function stubServerModule(name, exports) {
    const resolved = require.resolve(path.join(__dirname, '../../server', name));
    require.cache[resolved] = {
        exports, id: resolved, filename: resolved, loaded: true, children: [], paths: [],
    };
}

function matchesFilter(row, filter) {
    return Object.entries(filter).every(([field, condition]) => {
        if (condition && typeof condition === 'object' && condition.$in) return condition.$in.includes(row[field]);
        if (field === 'ownerId') return String(row[field]) === String(condition);
        return row[field] === condition;
    });
}

// In-memory stand-in for db.listVersions (only the methods list-versions.js uses).
function createListVersionsStub() {
    const rows = [];
    return {
        rows,
        findSorted(query, sort, limit) {
            const [[key, dir]] = Object.entries(sort);
            const matches = rows.filter((row) => matchesFilter(row, query));
            matches.sort((a, b) => (dir < 0 ? b[key] - a[key] : a[key] - b[key]));
            return Promise.resolve(matches.slice(0, limit));
        },
        updateOne(filter, update, options) {
            const exists = rows.some((row) => matchesFilter(row, filter));
            if (exists || !(options && options.upsert)) return Promise.resolve({ upsertedCount: 0 });
            rows.push({ ...filter, ...update.$setOnInsert });
            return Promise.resolve({ upsertedCount: 1 });
        },
        deleteMany(filter) {
            let deletedCount = 0;
            for (let i = rows.length - 1; i >= 0; i--) {
                if (matchesFilter(rows[i], filter)) {
                    rows.splice(i, 1);
                    deletedCount++;
                }
            }
            return Promise.resolve({ deletedCount });
        },
    };
}

// Stand-in for db.users over a live array. A `library.lists.externalId` query returns the FIRST
// matching user, like Mongo does for a non-unique field; put an impostor first to prove callers
// resolve owners by _id instead.
function createUsersStub(users) {
    return {
        findOne(query, cb) {
            const found = users.find((user) => {
                if (query._id) return String(user._id) === String(query._id);
                if (query['library.lists.externalId']) {
                    return ((user.library && user.library.lists) || []).some((list) => list.externalId === query['library.lists.externalId']);
                }
                return false;
            }) || null;
            if (cb) { cb(null, found); return undefined; }
            return Promise.resolve(found);
        },
        findMany() { return Promise.resolve(users); },
        save(user) { return Promise.resolve(user); },
    };
}

// A user whose library holds two lists: the shared one (externalId) and a private one that owns unrelated data.
function buildOwnerUser({ externalId = 'abc123', username = 'alice' } = {}) {
    return {
        _id: new ObjectId(),
        username,
        library: {
            version: '0.3',
            sequence: 20,
            totalUnit: 'g',
            itemUnit: 'g',
            currencySymbol: '€',
            defaultListId: 1,
            optionalFields: {},
            publicProfile: { displayName: 'Alice A', bio: 'not for snapshots' },
            entitlements: { plan: 'trail' },
            creator: { affiliateRules: [], disclosure: 'Affiliate links inside' },
            items: [
                {
                    id: 11, name: 'Tent', description: '', brand: 'Zpacks', weight: 900000, authorUnit: 'g', price: 500, url: 'https://zpacks.com/tent', affiliateUrl: '', promoCode: '', promoLabel: '',
                },
                {
                    id: 12, name: 'Stove', description: '', brand: 'BRS', weight: 100000, authorUnit: 'g', price: 20, url: '', affiliateUrl: '', promoCode: '', promoLabel: '',
                },
                {
                    id: 99, name: 'Unrelated', description: '', brand: '', weight: 5000, authorUnit: 'g', price: 0, url: '', affiliateUrl: '', promoCode: '', promoLabel: '',
                },
            ],
            categories: [
                {
                    id: 5, name: 'Shelter', categoryItems: [{ itemId: 11, qty: 1, worn: 0, consumable: false, star: 0 }],
                },
                {
                    id: 6, name: 'Cook', categoryItems: [{ itemId: 12, qty: 2, worn: 0, consumable: false, star: 0 }],
                },
                {
                    id: 7, name: 'Other list category', categoryItems: [{ itemId: 99, qty: 1, worn: 0, consumable: false, star: 0 }],
                },
            ],
            lists: [
                {
                    id: 1,
                    externalId,
                    name: 'PCT',
                    description: 'A description',
                    visibility: 'discoverable',
                    copyable: false,
                    allowSearchIndexing: false,
                    categoryIds: [5, 6],
                    seasons: ['summer'],
                    listTypes: ['trek'],
                    publicFields: { price: true, links: true, images: false },
                    copiedBy: ['someone'],
                    copyCount: 3,
                    aiAnalysis: { secret: true },
                },
                {
                    id: 2, externalId: 'zzz999', name: 'Other', visibility: 'private', categoryIds: [7],
                },
            ],
        },
    };
}

module.exports = {
    stubServerModule, createListVersionsStub, createUsersStub, buildOwnerUser,
};
