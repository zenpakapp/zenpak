/**
 * Unit test: an account with an unverified email cannot make its profile public, as it cannot
 * publish a list; a verified account can.
 * Run with: node test/unit-profile-verified-gate.js
 */

'use strict';

const assert = require('assert');
const { stubServerModule } = require('./fixtures/list-versions-fixtures.js');

let account;
let saved = null;
stubServerModule('db.js', {
    users: {
        save(user) { saved = JSON.parse(JSON.stringify(user)); return Promise.resolve(user); },
    },
});
stubServerModule('auth.js', {
    authenticateUser(req, res, next) { next(req, res, account); },
});
stubServerModule('public-list-projections.js', { syncUserPublicLists: async () => {} });

const router = require('../server/profile-endpoints.js');

const layer = router.stack.find((l) => l.route && l.route.path === '/api/profile' && l.route.methods.put);
assert.ok(layer, 'PUT /api/profile exists');

function put(body) {
    return new Promise((resolve) => {
        const res = {
            statusCode: 200,
            status(code) { this.statusCode = code; return this; },
            json(data) { resolve({ status: this.statusCode, data }); },
        };
        layer.route.stack[0].handle({ body, cookies: {} }, res);
    });
}

(async () => {
    account = { username: 'eve', emailVerified: false, library: { publicProfile: { visibility: 'private' } } };
    let result = await put({ visibility: 'discoverable', displayName: 'Eve' });
    assert.strictEqual(result.status, 403, 'unverified: no public profile');
    assert.strictEqual(result.data.code, 'email-not-verified');
    assert.strictEqual(saved, null, 'nothing was saved');

    result = await put({ visibility: 'private', displayName: 'Eve' });
    assert.strictEqual(result.status, 200, 'unverified: staying private is fine');

    account = { username: 'eve', emailVerified: true, library: { publicProfile: { visibility: 'private' } } };
    result = await put({ visibility: 'discoverable' });
    assert.strictEqual(result.status, 200, 'verified: public profile allowed');
    assert.strictEqual(saved.library.publicProfile.visibility, 'discoverable');

    console.log('unit-profile-verified-gate: ok');
    process.exit(0);
})().catch((err) => { console.error(err); process.exit(1); });
