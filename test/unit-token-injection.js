/**
 * Unit test: token lookups only accept strings, so a Mongo operator in a request cannot match a user.
 * Covers POST /resetPassword, GET /verify-email and POST /api/auth/google/set-username, and the
 * single-use, expiring setup token.
 * Run with: node test/unit-token-injection.js
 */

'use strict';

process.env.NODE_CONFIG = JSON.stringify({
    environment: 'test',
    stripeSecretKey: '',
    stripeWebhookSecret: '',
    kofiWebhookToken: '',
    databaseUrl: 'localhost/test',
    deployUrl: 'http://localhost:3000',
    googleClientId: 'id',
    googleClientSecret: 'secret',
    googleCallbackUrl: 'http://localhost:3000/api/auth/google/callback',
});

const assert = require('assert');
const { stubServerModule } = require('./fixtures/list-versions-fixtures.js');

const queries = [];
const updates = [];
let stored = null;
stubServerModule('db.js', {
    users: {
        findOne(query, cb) {
            queries.push(query);
            const match = stored && Object.keys(query).every((key) => typeof query[key] === 'string' && stored[key] === query[key]);
            const user = match ? stored : null;
            if (cb) return cb(null, user);
            return Promise.resolve(user);
        },
        save(user) { return Promise.resolve(user); },
        updateOne(filter, change) { updates.push(change); return Promise.resolve(); },
    },
});
stubServerModule('auth.js', {
    authenticateUser() {},
    generateSession(req, res, user, callback) { callback(req, res, user); },
    isModerator() { return false; },
});

const authRouter = require('../server/auth-endpoints.js');
const oauthRouter = require('../server/oauth.js');

function route(router, method, path) {
    const layer = router.stack.find((l) => l.route && l.route.path === path && l.route.methods[method]);
    assert.ok(layer, `${method} ${path} exists`);
    const handlers = layer.route.stack.map((s) => s.handle);
    return handlers[handlers.length - 1];
}

function call(handler, req) {
    return new Promise((resolve) => {
        const res = {
            statusCode: 200,
            status(code) { this.statusCode = code; return this; },
            json(data) { resolve({ status: this.statusCode, data }); },
            redirect(url) { resolve({ status: 302, url }); },
        };
        const next = () => resolve({ next: true });
        const out = handler({ body: {}, query: {}, cookies: {}, ...req }, res, next);
        if (out && typeof out.catch === 'function') out.catch(() => resolve({ status: 500 }));
    });
}

(async () => {
    const operator = { $ne: null };
    stored = {
        _id: 'u1', username: 'victim', resetToken: 'r-live', resetTokenExpiry: Date.now() + 60000, emailVerifyToken: 'v-live',
    };

    // An operator object in place of the reset token matches nobody.
    const reset = route(authRouter, 'post', '/resetPassword');
    let result = await call(reset, { body: { token: operator, password: 'longenough' } });
    assert.strictEqual(result.status, 400);
    assert.ok(!queries.some((q) => q.resetToken && typeof q.resetToken === 'object'), 'no operator reaches the query');

    // Same for the email verification token.
    const verify = route(authRouter, 'get', '/verify-email');
    result = await call(verify, { query: { token: operator } });
    assert.strictEqual(result.url, '/verify-email?error=1');
    assert.ok(!stored.emailVerified, 'the account was not verified');
    assert.ok(!queries.some((q) => q.emailVerifyToken && typeof q.emailVerifyToken === 'object'));

    // The real verification token still works.
    result = await call(verify, { query: { token: 'v-live' } });
    assert.strictEqual(result.url, '/verify-email?success=1');
    assert.strictEqual(stored.emailVerified, true);

    // Setup token: an operator is refused before any lookup.
    const setUsername = route(oauthRouter, 'post', '/api/auth/google/set-username');
    queries.length = 0;
    result = await call(setUsername, { body: { username: 'newname', setupToken: operator } });
    assert.strictEqual(result.status, 400);
    assert.strictEqual(queries.length, 0, 'no lookup was made');

    // An expired setup token is refused.
    stored = { _id: 'u2', username: 'oauth_abc', setupToken: 'setup-1', setupTokenExpiry: Date.now() - 1000 };
    result = await call(setUsername, { body: { username: 'newname', setupToken: 'setup-1' } });
    assert.strictEqual(result.status, 404);
    assert.ok(updates.length === 0, 'nothing was written');

    // A live setup token works once and is cleared in the database.
    stored = { _id: 'u2', username: 'oauth_abc', setupToken: 'setup-1', setupTokenExpiry: Date.now() + 60000 };
    result = await call(setUsername, { body: { username: 'newname', setupToken: 'setup-1' } });
    assert.strictEqual(result.status, 200);
    assert.strictEqual(updates.length, 1);
    assert.strictEqual(updates[0].$set.username, 'newname');
    assert.ok('setupToken' in updates[0].$unset, 'the setup token is removed from the account');

    console.log('unit-token-injection: ok');
    process.exit(0);
})().catch((err) => { console.error(err); process.exit(1); });
