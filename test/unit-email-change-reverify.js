/**
 * Unit test: changing the account email drops the verified state, so the new address cannot be
 * used to link a Google identity or to publish before it is proven.
 * Run with: node test/unit-email-change-reverify.js
 */

'use strict';

const assert = require('assert');
const { stubServerModule } = require('./fixtures/list-versions-fixtures.js');

let account;
let saved = null;
stubServerModule('db.js', {
    users: {
        findOne(query, cb) { if (cb) return cb(null, null); return Promise.resolve(null); },
        save(user, cb) { saved = { ...user }; if (cb) cb(null); return Promise.resolve(user); },
    },
});
stubServerModule('auth.js', {
    authenticateUser(req, res, next) { next(req, res, account); },
    verifyPassword() { return Promise.resolve(account); },
    generateSession() {},
});

const router = require('../server/account-endpoints.js');

const layer = router.stack.find((l) => l.route && l.route.path === '/account' && l.route.methods.post);
assert.ok(layer, 'POST /account exists');

(async () => {
    account = {
        username: 'eve', email: 'eve@example.com', emailVerified: true, emailVerifyToken: 'old-link', verifyEmailSentAt: 1,
    };
    const result = await new Promise((resolve) => {
        const res = {
            statusCode: 200,
            status(code) { this.statusCode = code; return this; },
            json(data) { resolve({ status: this.statusCode, data }); },
        };
        layer.route.stack[0].handle({ body: { currentPassword: 'pw', newEmail: 'victim@example.com' }, cookies: {} }, res);
    });
    assert.strictEqual(result.status, 200);
    assert.strictEqual(saved.email, 'victim@example.com');
    assert.strictEqual(saved.emailVerified, false, 'the new address is not verified');
    assert.strictEqual(saved.emailVerifyToken, undefined, 'a link sent to the old address is dead');
    assert.strictEqual(saved.verifyEmailSentAt, undefined, 'a new verification can be requested at once');

    console.log('unit-email-change-reverify: ok');
    process.exit(0);
})().catch((err) => { console.error(err); process.exit(1); });
