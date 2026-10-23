/**
 * Unit test: POST /moderation/offer-plan, the moderator action that gives an account Wayfarer or
 * Kin for a few months. Only moderators reach it; it refuses what the offer logic refuses.
 * Run with: node test/unit-moderation-offer.js
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

const accounts = {};
const saved = [];
stubServerModule('db.js', {
    users: {
        findOne(query) { return Promise.resolve(accounts[query.username] || null); },
        save(user) { saved.push(user); return Promise.resolve(user); },
        updateOne(filter, update) { saved.push({ _id: filter._id, billing: update.$set.billing, library: { entitlements: { plan: update.$set['library.entitlements.plan'] } } }); return Promise.resolve({ matchedCount: 1 }); },
    },
});

// The moderator gate: a moderator reaches the handler, anybody else is denied.
let caller = { username: 'fxbenard', moderator: true };
stubServerModule('auth.js', {
    authenticateModerator(req, res, callback) {
        if (!caller.moderator) return res.status(403).json({ message: 'Denied.' });
        return callback(req, res, caller);
    },
    authenticateUser() {},
    isModerator() { return true; },
});

const router = require('../server/moderation-endpoints.js');

async function post(path, body) {
    const layer = router.stack.find((l) => l.route && l.route.path === path && l.route.methods.post);
    assert.ok(layer, 'the route exists');
    return new Promise((resolve) => {
        const res = {
            statusCode: 200,
            status(code) { this.statusCode = code; return this; },
            json(data) { resolve({ status: this.statusCode, data }); },
        };
        layer.route.stack[0].handle({ body, cookies: {} }, res);
    });
}

const offer = (body) => post('/moderation/offer-plan', body);
const revoke = (body) => post('/moderation/revoke-offer', body);

const account = (overrides = {}) => ({
    username: 'alice',
    billing: {},
    library: { entitlements: { plan: 'free' } },
    ...overrides,
});

(async () => {
    // A moderator offers Wayfarer for 3 months. The name is normalised like everywhere else.
    accounts.alice = account();
    let result = await offer({ username: '  Alice ', plan: 'creator', months: 3 });
    assert.strictEqual(result.status, 200);
    assert.strictEqual(result.data.ok, true);
    assert.strictEqual(result.data.plan, 'creator');
    assert.ok(result.data.currentPeriodEnd > new Date().toISOString(), 'ends in the future');
    assert.strictEqual(saved.length, 1);
    assert.strictEqual(saved[0].library.entitlements.plan, 'creator');
    assert.strictEqual(saved[0].billing.provider, 'comp');
    assert.strictEqual(saved[0].billing.offeredBy, 'fxbenard', 'who gave it is on record');

    // The duration defaults to 3 months, and arrives as text from a form field.
    accounts.bob = account({ username: 'bob' });
    result = await offer({ username: 'bob', plan: 'supporter' });
    assert.strictEqual(result.status, 200);
    accounts.carol = account({ username: 'carol' });
    result = await offer({ username: 'carol', plan: 'creator', months: '6' });
    assert.strictEqual(result.status, 200);

    // What is refused, and that nothing is written then.
    const writes = saved.length;
    result = await offer({ username: 'nobody', plan: 'creator', months: 3 });
    assert.strictEqual(result.status, 404);
    result = await offer({ username: 'alice', plan: 'free', months: 3 });
    assert.strictEqual(result.status, 400);
    assert.strictEqual(result.data.code, 'invalid-plan');
    result = await offer({ username: 'alice', plan: 'creator', months: 40 });
    assert.strictEqual(result.status, 400);
    assert.strictEqual(result.data.code, 'invalid-months');
    result = await offer({ username: 'alice', plan: 'creator', months: 'x' });
    assert.strictEqual(result.status, 400);
    result = await offer({ plan: 'creator', months: 3 });
    assert.strictEqual(result.status, 404, 'no name');

    accounts.dave = account({
        username: 'dave',
        billing: { provider: 'stripe', subscriptionId: 'sub_1', status: 'active' },
        library: { entitlements: { plan: 'supporter' } },
    });
    result = await offer({ username: 'dave', plan: 'creator', months: 3 });
    assert.strictEqual(result.status, 409);
    assert.strictEqual(result.data.code, 'active-subscription');
    assert.strictEqual(accounts.dave.library.entitlements.plan, 'supporter', 'the subscription is left alone');
    assert.strictEqual(saved.length, writes, 'nothing written for a refused offer');

    // A plan given by hand has no end date: it is not replaced by a time-limited offer.
    accounts.frank = account({
        username: 'frank',
        library: { entitlements: { plan: 'creator', source: 'manual' } },
    });
    const writesBeforeFrank = saved.length;
    result = await offer({ username: 'frank', plan: 'creator', months: 3 });
    assert.strictEqual(result.status, 409);
    assert.strictEqual(result.data.code, 'permanent-plan');
    assert.strictEqual(accounts.frank.billing.provider, undefined, 'the account is left alone');
    assert.strictEqual(saved.length, writesBeforeFrank, 'nothing written for a refused offer');

    // A running offer is withdrawn: the account is free again, and it is written down.
    const writesBeforeRevoke = saved.length;
    result = await revoke({ username: 'alice' });
    assert.strictEqual(result.status, 200);
    assert.strictEqual(result.data.ok, true);
    assert.strictEqual(result.data.plan, 'creator', 'says which plan ended');
    assert.strictEqual(accounts.alice.library.entitlements.plan, 'free');
    assert.strictEqual(accounts.alice.billing.status, 'revoked');
    assert.strictEqual(accounts.alice.billing.revokedBy, 'fxbenard');
    assert.strictEqual(saved.length, writesBeforeRevoke + 1);

    // Nothing to withdraw: refused, nothing written.
    const writesBeforeRefusal = saved.length;
    result = await revoke({ username: 'alice' });
    assert.strictEqual(result.status, 409, 'already withdrawn');
    assert.strictEqual(result.data.code, 'no-offer');
    result = await revoke({ username: 'frank' });
    assert.strictEqual(result.status, 409, 'a permanent plan is not an offer');
    assert.strictEqual(accounts.frank.library.entitlements.plan, 'creator');
    result = await revoke({ username: 'nobody' });
    assert.strictEqual(result.status, 404);
    assert.strictEqual(saved.length, writesBeforeRefusal);

    // Anybody who is not a moderator is denied before the handler runs.
    caller = { username: 'mallory', moderator: false };
    accounts.erin = account({ username: 'erin' });
    result = await offer({ username: 'erin', plan: 'creator', months: 3 });
    assert.strictEqual(result.status, 403);
    assert.strictEqual(accounts.erin.library.entitlements.plan, 'free');
    accounts.erin.library.entitlements.plan = 'creator';
    accounts.erin.billing = {
        provider: 'comp', status: 'active', plan: 'creator', currentPeriodEnd: '2999-01-01T00:00:00.000Z',
    };
    result = await revoke({ username: 'erin' });
    assert.strictEqual(result.status, 403);
    assert.strictEqual(accounts.erin.library.entitlements.plan, 'creator', 'a non-moderator withdraws nothing');
    assert.strictEqual(saved.length, writesBeforeRefusal);

    console.log('ok');
    process.exit(0);
})().catch((error) => { console.error(error); process.exit(1); });
