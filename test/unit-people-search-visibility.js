/**
 * Unit test: the People search finds link-only (shareable) profiles by exact username only, and
 * shows a bio only for Guide accounts, as the public profile page does.
 * Run with: node test/unit-people-search-visibility.js
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
const { stubServerModule } = require('./fixtures/list-versions-fixtures.js');

const pipelines = [];
stubServerModule('db.js', {
    users: {
        aggregate(pipeline) { pipelines.push(pipeline); return Promise.resolve([]); },
    },
});
stubServerModule('auth.js', {
    authenticateUser() {},
    authenticateModerator() {},
    isModerator() { return false; },
});

const router = require('../server/community-endpoints.js');

const layer = router.stack.find((l) => l.route && l.route.path === '/users' && l.route.methods.get);
assert.ok(layer, 'the route exists');

function people(q) {
    return new Promise((resolve) => {
        const res = {
            status() { return this; },
            json(data) { resolve(data); },
        };
        layer.route.stack[0].handle({ query: { q }, cookies: {} }, res);
    });
}

(async () => {
    await people('Zen.Pak');
    const match = pipelines[0].find((stage) => stage.$match).$match;
    const [clause] = match.$and;
    assert.deepStrictEqual(
        clause.$or[0],
        { 'library.publicProfile.visibility': { $in: ['discoverable', 'indexable'] } },
        'discoverable and indexable profiles match the search',
    );
    assert.deepStrictEqual(
        clause.$or[1],
        { 'library.publicProfile.visibility': 'shareable', username: 'zen.pak' },
        'a link-only profile matches only on the exact username',
    );
    assert.ok(!JSON.stringify(match).includes('"shareable","discoverable"'), 'shareable is not in the broad visibility list');

    const project = pipelines[0].find((stage) => stage.$project).$project;
    assert.deepStrictEqual(project.bio.$cond[0], { $eq: [{ $ifNull: ['$library.entitlements.plan', 'free'] }, 'creator'] }, 'the bio is read only for creator accounts');
    assert.strictEqual(project.bio.$cond[2], '', 'other accounts get an empty bio');

    console.log('unit-people-search-visibility: ok');
})().catch((err) => {
    console.error(err);
    process.exit(1);
});
