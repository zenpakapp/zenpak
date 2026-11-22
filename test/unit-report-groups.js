/**
 * Unit test: the moderation report list (GET /api/reports) groups pending reports by target, sorts
 * the most reported first (then the most recent), filters by type and reason, pages by 50, and a
 * target can be resolved in one call (PATCH /api/reports/target).
 * Run with: node test/unit-report-groups.js
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

let store = [];
const saved = [];
stubServerModule('db.js', {
    reports: {
        findMany(query) {
            return Promise.resolve(store.filter((r) => Object.keys(query).every((key) => r[key] === query[key])));
        },
        save(doc) {
            saved.push(doc);
            const index = store.findIndex((r) => String(r._id) === String(doc._id));
            if (index >= 0) store[index] = doc;
            return Promise.resolve(doc);
        },
    },
});
stubServerModule('auth.js', {
    authenticateUser() {},
    authenticateModerator(req, res, callback) { return callback(req, res, { username: 'mod' }); },
    isModerator() { return false; },
});
stubServerModule('public-list-projections.js', { syncUserPublicLists() { return Promise.resolve(); } });
const ownerLookups = [];
stubServerModule('list-versions.js', {
    getPublishedOwner(externalId) {
        ownerLookups.push(externalId);
        return Promise.resolve({ username: `owner-of-${externalId}` });
    },
});

const router = require('../server/report-endpoints.js');

const list = router.stack.find((l) => l.route && l.route.path === '/' && l.route.methods.get);
const resolveTarget = router.stack.find((l) => l.route && l.route.path === '/target' && l.route.methods.patch);
assert.ok(list, 'GET / exists');
assert.ok(resolveTarget, 'PATCH /target exists');

const routePaths = router.stack.filter((l) => l.route && l.route.methods.patch).map((l) => l.route.path);
assert.ok(routePaths.indexOf('/target') < routePaths.indexOf('/:id'), '/target is declared before /:id so it is not read as an id');

let counter = 0;
function report(targetType, targetId, reason, reporter, minutesAgo, status = 'pending') {
    counter += 1;
    return {
        _id: new ObjectId(),
        targetType,
        targetId,
        reason,
        reporterUsername: reporter,
        status,
        createdAt: new Date(Date.now() - minutesAgo * 60000 - counter),
    };
}

function call(layer, req) {
    return new Promise((resolve) => {
        let statusCode = 200;
        const res = {
            status(code) { statusCode = code; return this; },
            json(data) { resolve({ statusCode, data }); },
        };
        layer.route.stack[0].handle({ query: {}, body: {}, ...req }, res);
    });
}

(async () => {
    // Three reports on one list, two on a user, one on another list, one resolved (ignored).
    store = [
        report('list', 'popular', 'spam', 'a', 50),
        report('list', 'popular', 'spam', 'b', 40),
        report('list', 'popular', 'fake', 'c', 30),
        report('user', 'badguy', 'inappropriate', 'a', 20),
        report('user', 'badguy', 'other', 'd', 10),
        report('list', 'recent', 'spam', 'e', 1),
        report('list', 'old', 'spam', 'f', 5000, 'resolved'),
    ];

    let { data } = await call(list, {});
    assert.deepStrictEqual(data.reports.map((g) => g.targetId), ['popular', 'badguy', 'recent'], 'most reported first, then most recent; resolved ignored');
    assert.strictEqual(data.total, 3, 'total counts targets, not reports');
    assert.strictEqual(data.hasMore, false);

    const popular = data.reports[0];
    assert.strictEqual(popular.count, 3, 'a target shows how many reports it has');
    assert.deepStrictEqual(popular.reasons, { spam: 2, fake: 1 }, 'reasons are counted');
    assert.deepStrictEqual([...popular.reporters].sort(), ['a', 'b', 'c'], 'reporters are listed');
    assert.ok(popular.latestAt instanceof Date, 'the latest report date is given');
    assert.strictEqual(popular.targetOwnerUsername, 'owner-of-popular', 'a list group names its author');
    assert.strictEqual(data.reports[1].targetOwnerUsername, undefined, 'a user group has no owner lookup');

    // Filters apply before grouping.
    ({ data } = await call(list, { query: { type: 'user' } }));
    assert.deepStrictEqual(data.reports.map((g) => g.targetId), ['badguy'], 'type filter');

    ({ data } = await call(list, { query: { reason: 'fake' } }));
    assert.deepStrictEqual(data.reports.map((g) => g.targetId), ['popular'], 'reason filter');
    assert.strictEqual(data.reports[0].count, 1, 'a filtered group counts only matching reports');

    ({ data } = await call(list, { query: { type: 'nonsense', reason: 'nonsense' } }));
    assert.strictEqual(data.reports.length, 3, 'unknown filter values are ignored');

    // Paging: 60 targets, 50 per page, the owner lookup only runs for the page shown.
    store = Array.from({ length: 60 }, (_, i) => report('list', `list${i}`, 'spam', 'a', i));
    ownerLookups.length = 0;
    ({ data } = await call(list, {}));
    assert.strictEqual(data.reports.length, 50, 'a page holds 50 targets');
    assert.strictEqual(data.hasMore, true);
    assert.strictEqual(data.total, 60);
    assert.strictEqual(ownerLookups.length, 50, 'owners are looked up for the page only');

    ({ data } = await call(list, { query: { skip: '50' } }));
    assert.strictEqual(data.reports.length, 10, 'the second page holds the rest');
    assert.strictEqual(data.hasMore, false);
    ({ data } = await call(list, { query: { skip: '-3' } }));
    assert.strictEqual(data.reports.length, 50, 'a negative skip is ignored');

    // Resolving a target closes all its pending reports at once.
    store = [
        report('list', 'popular', 'spam', 'a', 50),
        report('list', 'popular', 'fake', 'b', 40),
        report('list', 'other', 'spam', 'c', 30),
    ];
    saved.length = 0;
    let result = await call(resolveTarget, { body: { targetType: 'list', targetId: 'popular', status: 'resolved' } });
    assert.strictEqual(result.statusCode, 200);
    assert.strictEqual(result.data.updated, 2, 'both reports on the target are closed');
    assert.ok(store.filter((r) => r.targetId === 'popular').every((r) => r.status === 'resolved' && r.resolvedAt instanceof Date));
    assert.strictEqual(store.find((r) => r.targetId === 'other').status, 'pending', 'other targets are untouched');
    assert.ok(store.filter((r) => r.targetId === 'popular').every((r) => r.resolvedBy === 'mod' && r.resolution === 'none'),
        'each closed report keeps who closed it and that no action was recorded');

    result = await call(resolveTarget, { body: { targetType: 'list', targetId: 'other', status: 'dismissed', note: 'not spam' } });
    assert.strictEqual(store.find((r) => r.targetId === 'other').status, 'dismissed', 'dismissed is accepted');
    assert.strictEqual(store.find((r) => r.targetId === 'other').resolution, 'dismissed', 'a dismissal is its own outcome');
    assert.strictEqual(store.find((r) => r.targetId === 'other').resolutionNote, 'not spam', 'the note is kept');

    result = await call(resolveTarget, { body: { targetType: 'list', targetId: 'other', status: 'pending' } });
    assert.strictEqual(result.statusCode, 400, 'only resolved or dismissed are accepted');
    result = await call(resolveTarget, { body: { targetType: 'comment', targetId: 'x', status: 'resolved' } });
    assert.strictEqual(result.statusCode, 400, 'the target type is checked');
    result = await call(resolveTarget, { body: { targetType: 'list', status: 'resolved' } });
    assert.strictEqual(result.statusCode, 400, 'the target id is required');

    // A crowd of new or unverified accounts does not push a target above one reported by established
    // accounts: the queue is ordered by the reports that count first.
    const untrusted = (target, reporter, minutesAgo) => ({ ...report('list', target, 'spam', reporter, minutesAgo), reporterTrusted: false });
    const trusted = (target, reporter, minutesAgo) => ({ ...report('list', target, 'spam', reporter, minutesAgo), reporterTrusted: true });
    store = [
        untrusted('crowd', 'n1', 9), untrusted('crowd', 'n2', 8), untrusted('crowd', 'n3', 7),
        untrusted('crowd', 'n4', 6), untrusted('crowd', 'n5', 5),
        trusted('solid', 'v1', 30), trusted('solid', 'v2', 20),
        report('list', 'legacy', 'spam', 'old1', 100), // saved before the field existed
    ];
    ({ data } = await call(list, {}));
    assert.deepStrictEqual(data.reports.map((g) => g.targetId), ['solid', 'legacy', 'crowd'], 'reports from established accounts weigh first, five new accounts come last');
    const crowd = data.reports.find((g) => g.targetId === 'crowd');
    assert.strictEqual(crowd.count, 5, 'the crowd is still counted');
    assert.strictEqual(crowd.trustedCount, 0, 'but none of it comes from a verified, established account');
    assert.strictEqual(data.reports.find((g) => g.targetId === 'solid').trustedCount, 2);
    assert.strictEqual(data.reports.find((g) => g.targetId === 'legacy').trustedCount, 1, 'a report saved before the field counts as trusted');

    console.log('unit-report-groups OK');
    process.exit(0);
})().catch((error) => { console.error(error); process.exit(1); });
