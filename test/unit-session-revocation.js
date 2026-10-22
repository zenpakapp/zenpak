/**
 * Unit test: a Ko-fi donation does not replace a running subscription, and sessions end when
 * they should (password reset, sign out).
 * Run with: node test/unit-session-revocation.js
 */

'use strict';

process.env.NODE_CONFIG = JSON.stringify({
    environment: 'test',
    stripeSecretKey: '',
    stripeWebhookSecret: '',
    kofiWebhookToken: 'token',
    databaseUrl: 'localhost/test',
    deployUrl: 'http://localhost:3000',
    googleClientId: 'id',
    googleClientSecret: 'secret',
    googleCallbackUrl: 'http://localhost:3000/api/auth/google/callback',
});

const assert = require('assert');
const { stubServerModule } = require('./fixtures/list-versions-fixtures.js');

const updates = [];
let stored = null;
let saved = null;
stubServerModule('db.js', {
    users: {
        findOne(query, cb) {
            const user = stored && stored.resetToken === query.resetToken ? stored : null;
            if (cb) return cb(null, user);
            return Promise.resolve(user);
        },
        save(user, cb) { saved = { ...user }; if (cb) cb(null); return Promise.resolve(user); },
        updateOne(filter, change) { updates.push([filter, change]); return Promise.resolve(); },
    },
});
stubServerModule('auth.js', {
    authenticateUser() {},
    generateSession() {},
    isModerator() { return false; },
});

const { syncKofiBilling } = require('../server/billing.js');
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
            cleared: false,
            status(code) { this.statusCode = code; return this; },
            json(data) { resolve({ status: this.statusCode, data, cleared: this.cleared }); },
            clearCookie() { this.cleared = true; },
        };
        handler({ body: {}, query: {}, cookies: {}, ...req }, res, () => resolve({ next: true }));
    });
}

(async () => {
    const donation = { amount: '5.00', donationDate: new Date().toISOString() };

    // A running Stripe subscription is left alone.
    let user = {
        username: 'dana',
        billing: {
            provider: 'stripe', subscriptionId: 'sub_1', status: 'active', plan: 'creator',
        },
        library: { entitlements: { plan: 'creator' } },
    };
    await syncKofiBilling(user, donation);
    assert.strictEqual(user.billing.provider, 'stripe');
    assert.strictEqual(user.library.entitlements.plan, 'creator');

    // An ended subscription does not block a donation.
    user = {
        username: 'dana',
        billing: {
            provider: 'stripe', subscriptionId: 'sub_1', status: 'canceled', plan: 'free',
        },
        library: { entitlements: { plan: 'free' } },
    };
    await syncKofiBilling(user, donation);
    assert.strictEqual(user.billing.provider, 'kofi');
    assert.strictEqual(user.library.entitlements.plan, 'supporter');

    // A password reset ends the session opened with the old password.
    stored = {
        username: 'dana', token: 'old-session', resetToken: 'r1', resetTokenExpiry: Date.now() + 60000,
    };
    const reset = route(authRouter, 'post', '/resetPassword');
    const result = await call(reset, { body: { token: 'r1', password: 'longenough' } });
    assert.strictEqual(result.status, 200);
    // Unset, not null: the token index is unique, so a second null would collide.
    assert.strictEqual(saved.token, undefined, 'the old session token is gone');

    // Signing out ends the session on the server, not only in the browser.
    const signout = route(oauthRouter, 'post', '/api/auth/signout');
    const out = await call(signout, { cookies: { lp: 'abc' } });
    assert.strictEqual(out.status, 200);
    assert.ok(out.cleared, 'cookie cleared');
    assert.deepStrictEqual(updates[0][0], { token: 'abc' });
    assert.ok('token' in updates[0][1].$unset);

    // An operator in the cookie never reaches the database.
    updates.length = 0;
    await call(signout, { cookies: { lp: { $ne: null } } });
    assert.strictEqual(updates.length, 0);

    console.log('unit-session-revocation: ok');
    process.exit(0);
})().catch((err) => { console.error(err); process.exit(1); });
