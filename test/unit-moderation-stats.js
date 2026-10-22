/**
 * Unit test: the moderation "Chiffres" panel counts accounts, plans, public lists and activity.
 * Read-only: it only counts. A new account is dated from its id, so no field was added.
 * Run with: node test/unit-moderation-stats.js
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
const { ObjectId } = require('mongodb');
const { stubServerModule } = require('./fixtures/list-versions-fixtures.js');

const NOW = new Date('2026-10-20T12:00:00.000Z');
const daysAgo = (days) => new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);
const idFrom = (date) => ObjectId.createFromTime(Math.floor(date.getTime() / 1000));
const plan = (name) => ({ library: { entitlements: { plan: name } } });

const userDocs = [
    { _id: idFrom(daysAgo(1)), emailVerified: true, ...plan('free') },
    { _id: idFrom(daysAgo(3)), emailVerified: false },
    { _id: idFrom(daysAgo(10)), emailVerified: true, ...plan('creator') },
    { _id: idFrom(daysAgo(20)), emailVerified: true, ...plan('supporter'), banned: true },
    { _id: idFrom(daysAgo(90)), emailVerified: true, ...plan('creator'), billing: { provider: 'comp', status: 'active' } },
];
const listDocs = [
    { visibility: 'shareable' },
    { visibility: 'discoverable', featured: true },
    { visibility: 'discoverable' },
    { visibility: 'indexable' },
];

// A tiny matcher for the queries the panel makes: equality, dotted paths, and `_id >= date`.
function valueAt(doc, path) {
    return path.split('.').reduce((value, key) => (value === undefined || value === null ? undefined : value[key]), doc);
}
function matches(doc, query) {
    return Object.entries(query).every(([path, expected]) => {
        if (expected && typeof expected === 'object' && expected.$gte) {
            return doc[path].getTimestamp().getTime() >= expected.$gte.getTimestamp().getTime();
        }
        return valueAt(doc, path) === expected;
    });
}
const collection = (docs) => ({ count: async (query = {}) => docs.filter((doc) => matches(doc, query)).length });

stubServerModule('db.js', {
    users: collection(userDocs),
    publicLists: collection(listDocs),
    reports: collection([{ status: 'pending' }, { status: 'pending' }, { status: 'dismissed' }]),
    publicListStats: { aggregate: async () => [{ _id: null, views: 120, copies: 7, csvDownloads: 4 }] },
});

const { collectStats } = require('../server/moderation-stats.js');

(async () => {
    const stats = await collectStats(NOW);
    assert.deepStrictEqual(stats, {
        users: {
            total: 5, last7Days: 2, last30Days: 4, verified: 4, banned: 1,
        },
        plans: {
            free: 2, supporter: 1, creator: 2, offered: 1,
        },
        lists: {
            shareable: 1, discoverable: 2, indexable: 1, featured: 1,
        },
        activity: {
            views: 120, copies: 7, csvDownloads: 4, pendingReports: 2,
        },
    });

    // No stats yet: the totals are zero, not missing.
    stubServerModule('db.js', {
        users: collection([]),
        publicLists: collection([]),
        reports: collection([]),
        publicListStats: { aggregate: async () => [] },
    });
    delete require.cache[require.resolve('../server/moderation-stats.js')];
    const empty = await require('../server/moderation-stats.js').collectStats(NOW);
    assert.deepStrictEqual(empty.activity, {
        views: 0, copies: 0, csvDownloads: 0, pendingReports: 0,
    });
    assert.strictEqual(empty.plans.free, 0);

    console.log('ok');
})();
