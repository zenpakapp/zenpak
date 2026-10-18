/**
 * Unit test: GET /api/community/discover filters and searches in the query, not in memory.
 * Discover used to load the 200 newest lists and filter those, so an older list was never
 * found by the search bar or by the season/type/weight filters.
 * Run with: node test/unit-discover-search.js
 */

'use strict';

const assert = require('assert');

const rows = [];
const queriesSeen = [];

function matchesQuery(row, query) {
    if (query.visibility && query.visibility.$in && !query.visibility.$in.includes(row.visibility)) return false;
    if (query.updatedAt && query.updatedAt.$lt && !(new Date(row.updatedAt) < query.updatedAt.$lt)) return false;
    if (typeof query.seasons === 'string' && !(row.seasons || []).includes(query.seasons)) return false;
    if (typeof query.listTypes === 'string' && !(row.listTypes || []).includes(query.listTypes)) return false;
    if (query.totalBaseWeight) {
        const w = Number(row.totalBaseWeight) || 0;
        if (query.totalBaseWeight.$gte !== undefined && w < query.totalBaseWeight.$gte) return false;
        if (query.totalBaseWeight.$lte !== undefined && w > query.totalBaseWeight.$lte) return false;
    }
    for (const clause of query.$and || []) {
        const pattern = clause.searchTokens;
        if (!(row.searchTokens || []).some((token) => pattern.test(token))) return false;
    }
    return true;
}

const dbStub = {
    users: { findMany() { return Promise.resolve([]); } },
    publicLists: {
        findSorted(query, sort, limit) {
            queriesSeen.push({ query, sort, limit });
            const [[key, dir]] = Object.entries(sort);
            const value = (r) => (key === 'updatedAt' ? new Date(r.updatedAt).getTime() : Number(r[key] || 0));
            const out = rows
                .filter((row) => matchesQuery(row, query))
                .sort((a, b) => (dir < 0 ? value(b) - value(a) : value(a) - value(b)));
            return Promise.resolve(out.slice(0, limit));
        },
    },
};
const stub = (name, exports) => {
    const id = require.resolve(`../server/${name}`);
    require.cache[id] = {
        exports, id, filename: id, loaded: true, children: [], paths: [],
    };
};
stub('db.js', dbStub);
stub('auth.js', { authenticateUser: () => {} });
stub('feed-events.js', { getFeedForUser: async () => ({ events: [], nextCursor: null }) });

const router = require('../server/community-endpoints.js');
const { buildSearchTokens } = require('../server/search-text.js');

function addList(index, overrides = {}) {
    const row = {
        externalId: `list${index}`,
        name: `List ${index}`,
        description: '',
        visibility: 'discoverable',
        ownerUsername: `user${index}`,
        ownerDisplayName: `User ${index}`,
        ownerTier: 'base',
        totalBaseWeight: 5000000,
        viewCount: 0,
        copyCount: 0,
        seasons: [],
        listTypes: [],
        // Higher index = newer.
        updatedAt: new Date(Date.UTC(2026, 0, 1) + index * 3600 * 1000),
        ...overrides,
    };
    row.searchTokens = buildSearchTokens({
        name: row.name,
        description: row.description,
        ownerDisplayName: row.ownerDisplayName,
        ownerUsername: row.ownerUsername,
        itemNames: row.itemNames || [],
        itemBrands: row.itemBrands || [],
    });
    rows.push(row);
    return row;
}

async function discover(query) {
    const route = router.stack.find((layer) => layer.route && layer.route.path === '/discover');
    let status = 200;
    let body;
    await new Promise((resolve) => {
        const res = {
            status(code) { status = code; return this; },
            json(data) { body = data; resolve(); },
        };
        route.route.stack[0].handle({ query }, res);
    });
    return { status, body };
}

async function run() {
    // 300 filler lists, then an OLD list that only a real search can reach.
    for (let i = 10; i < 310; i += 1) addList(i);
    addList(0, {
        externalId: 'old-tent',
        name: 'Tente Quechua',
        seasons: ['winter'],
        listTypes: ['alpine'],
        totalBaseWeight: 900000,
    });

    // The old list is outside the 200 newest, yet it is found.
    let result = await discover({ q: 'tente' });
    assert.deepStrictEqual(result.body.lists.map((l) => l.externalId), ['old-tent'], 'search reaches a list older than the newest 200');

    // Prefix and accents.
    result = await discover({ q: 'tent' });
    assert.strictEqual(result.body.lists[0].externalId, 'old-tent', 'a word prefix matches');
    addList(1, { externalId: 'etanche', name: 'Sac étanche' });
    result = await discover({ q: 'etanche' });
    assert.strictEqual(result.body.lists[0].externalId, 'etanche', 'accents do not matter');

    // Filters run in the query too.
    result = await discover({ season: 'winter' });
    assert.deepStrictEqual(result.body.lists.map((l) => l.externalId), ['old-tent'], 'season filter reaches an old list');
    result = await discover({ type: 'alpine' });
    assert.deepStrictEqual(result.body.lists.map((l) => l.externalId), ['old-tent'], 'type filter reaches an old list');
    result = await discover({ maxWeight: '1000000' });
    assert.deepStrictEqual(result.body.lists.map((l) => l.externalId), ['old-tent'], 'weight filter reaches an old list');
    result = await discover({ q: 'tente', season: 'summer' });
    assert.strictEqual(result.body.lists.length, 0, 'filters combine with the search');

    // Relevance first, then newest first.
    rows.length = 0;
    addList(5, { externalId: 'items-only', name: 'Weekend', itemNames: ['Sac à dos'] });
    addList(6, { externalId: 'in-name-old', name: 'Mon sac', updatedAt: new Date('2026-01-02') });
    addList(7, { externalId: 'in-name-new', name: 'Sac léger', updatedAt: new Date('2026-03-01') });
    addList(8, { externalId: 'in-owner', name: 'Autre', ownerDisplayName: 'Sacha' });
    result = await discover({ q: 'sac' });
    assert.deepStrictEqual(
        result.body.lists.map((l) => l.externalId),
        ['in-name-new', 'in-name-old', 'in-owner', 'items-only'],
        'name matches first (newest first on ties), then author, then items',
    );

    // Every word must match.
    result = await discover({ q: 'sac zzz' });
    assert.strictEqual(result.body.lists.length, 0, 'all query words must match');

    // A query with no usable word returns nothing instead of everything.
    result = await discover({ q: 'x' });
    assert.strictEqual(result.body.lists.length, 0, 'a one-letter query matches nothing');

    // Pagination of a search: 20 per page, no duplicates, ends with a null cursor.
    rows.length = 0;
    for (let i = 0; i < 45; i += 1) addList(i, { name: `Sac ${i}` });
    const seen = [];
    let cursor = null;
    let pages = 0;
    do {
        result = await discover(cursor ? { q: 'sac', cursor } : { q: 'sac' });
        assert.strictEqual(result.status, 200);
        seen.push(...result.body.lists.map((l) => l.externalId));
        cursor = result.body.nextCursor;
        pages += 1;
    } while (cursor && pages < 10);
    assert.strictEqual(pages, 3, 'three pages for 45 matches');
    assert.strictEqual(new Set(seen).size, 45, 'every match exactly once');
    assert.strictEqual(cursor, null, 'last page has no cursor');

    // Invalid cursors are rejected.
    result = await discover({ q: 'sac', cursor: 'nope' });
    assert.strictEqual(result.status, 400);

    // Browsing without a search keeps its date cursor and one bounded query.
    rows.length = 0;
    for (let i = 0; i < 30; i += 1) addList(i);
    queriesSeen.length = 0;
    result = await discover({});
    assert.strictEqual(result.body.lists.length, 20);
    assert.ok(result.body.nextCursor && !Number.isNaN(Date.parse(result.body.nextCursor)), 'browse cursor is still a date');
    assert.ok(queriesSeen[0].limit <= 21, 'browsing no longer loads 200 lists');

    console.log('ok');
}

run().catch((err) => { console.error(err); process.exit(1); });
