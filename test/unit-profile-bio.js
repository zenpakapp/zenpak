/**
 * Unit test: the bio comes with Kin and Wayfarer. A free account cannot save one, and the public
 * profile shows it for Kin and Wayfarer, while links and gear philosophy stay Wayfarer only.
 * Run with: node test/unit-profile-bio.js
 */

'use strict';

const assert = require('assert');
const { ObjectId } = require('mongodb');
const { stubServerModule } = require('./fixtures/list-versions-fixtures.js');

let account;
let lastSet = null;
let publicUser;

stubServerModule('db.js', {
    users: {
        updateOne(filter, update) { lastSet = update.$set; return Promise.resolve({ matchedCount: 1 }); },
        findOne() { return Promise.resolve(publicUser); },
    },
    follows: { findMany() { return Promise.resolve([]); } },
});
stubServerModule('auth.js', {
    authenticateUser(req, res, next) { next(req, res, account); },
});
stubServerModule('public-list-projections.js', {
    syncUserPublicLists: async () => {},
    publicListIds: () => [],
});
stubServerModule('public-sharing.js', {
    buildPublicProfile: async (user) => ({
        profile: {
            bio: user.library.publicProfile.bio,
            links: user.library.publicProfile.links,
            gearPhilosophy: user.library.publicProfile.gearPhilosophy,
        },
    }),
    buildPublicList: async () => null,
});

const profileRouter = require('../server/profile-endpoints.js');
const publicRouter = require('../server/public-endpoints.js');

function call(router, method, path, req) {
    const layer = router.stack.find((l) => l.route && l.route.path === path && l.route.methods[method]);
    assert.ok(layer, `${method} ${path} exists`);
    return new Promise((resolve) => {
        const res = {
            statusCode: 200,
            status(code) { this.statusCode = code; return this; },
            json(data) { resolve({ status: this.statusCode, data }); },
        };
        layer.route.stack[0].handle({ cookies: {}, body: {}, params: {}, ...req }, res, () => resolve({ status: 404 }));
    });
}

const library = (plan) => ({
    entitlements: { plan },
    publicProfile: {
        visibility: 'discoverable', bio: 'Hello', links: [{ label: 'Blog', url: 'https://example.com' }], gearPhilosophy: ['Light'],
    },
});

(async () => {
    // Saving a bio
    account = { _id: new ObjectId(), username: 'eve', emailVerified: true, library: library('free') };
    lastSet = null;
    let result = await call(profileRouter, 'put', '/api/profile', { body: { bio: 'My bio' } });
    assert.strictEqual(result.status, 200);
    assert.strictEqual(lastSet, null, 'free: a bio is not saved');

    account = { _id: new ObjectId(), username: 'eve', emailVerified: true, library: library('supporter') };
    result = await call(profileRouter, 'put', '/api/profile', { body: { bio: 'My bio' } });
    assert.strictEqual(lastSet['library.publicProfile.bio'], 'My bio', 'Kin: the bio is saved');

    account = { _id: new ObjectId(), username: 'eve', emailVerified: true, library: library('creator') };
    result = await call(profileRouter, 'put', '/api/profile', { body: { bio: 'Other' } });
    assert.strictEqual(lastSet['library.publicProfile.bio'], 'Other', 'Wayfarer: the bio is saved');

    // Reading a public profile
    const read = async (plan) => {
        publicUser = { _id: new ObjectId(), username: 'eve', library: library(plan) };
        const out = await call(publicRouter, 'get', '/api/public/profile/:username', { params: { username: 'eve' } });
        return out.data.profile;
    };
    let profile = await read('free');
    assert.strictEqual(profile.bio, '', 'free: no bio shown');
    assert.deepStrictEqual(profile.links, [], 'free: no links');

    profile = await read('supporter');
    assert.strictEqual(profile.bio, 'Hello', 'Kin: the bio is shown');
    assert.deepStrictEqual(profile.links, [], 'Kin: no links');
    assert.deepStrictEqual(profile.gearPhilosophy, [], 'Kin: no gear philosophy');

    profile = await read('creator');
    assert.strictEqual(profile.bio, 'Hello', 'Wayfarer: the bio is shown');
    assert.strictEqual(profile.links.length, 1, 'Wayfarer: links are shown');
    assert.deepStrictEqual(profile.gearPhilosophy, ['Light'], 'Wayfarer: gear philosophy is shown');

    console.log('unit-profile-bio: ok');
    process.exit(0);
})().catch((err) => { console.error(err); process.exit(1); });
