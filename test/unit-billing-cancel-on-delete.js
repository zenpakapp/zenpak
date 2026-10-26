/**
 * Unit test: cancelSubscriptionsForDeletion stops the billing of an account that is being deleted.
 * It cancels every live subscription of the Stripe customer, leaves the already ended ones alone,
 * never touches the customer (its invoices are kept), and lets a Stripe failure come back to the
 * caller so the deletion can stop.
 * Run with: node test/unit-billing-cancel-on-delete.js
 */

'use strict';

process.env.NODE_CONFIG = JSON.stringify({
    environment: 'test',
    stripeSecretKey: 'sk_test_fake',
    stripeWebhookSecret: '',
    kofiWebhookToken: 'test-token-123',
    databaseUrl: 'localhost/test',
    deployUrl: 'http://localhost:3000',
});

const assert = require('assert');
const { stubServerModule } = require('./fixtures/list-versions-fixtures.js');

const cancelled = [];
const listed = [];
let subscriptions = [];
let failList = false;
const fakeStripe = {
    subscriptions: {
        async list(query) {
            listed.push(query);
            if (failList) throw new Error('Stripe is down');
            return { data: subscriptions };
        },
        async cancel(id) { cancelled.push(id); return { id, status: 'canceled' }; },
    },
    customers: { del() { throw new Error('the customer must stay: its invoices are kept'); } },
};
const stripePath = require.resolve('stripe');
require.cache[stripePath] = {
    exports: () => fakeStripe, id: stripePath, filename: stripePath, loaded: true, children: [], paths: [],
};

stubServerModule('db.js', { users: { save: async () => {}, updateOne: async () => ({ matchedCount: 1 }) } });
stubServerModule('public-list-projections.js', { syncUserPublicLists: async () => {} });

const { cancelSubscriptionsForDeletion } = require('../server/billing.js');

(async () => {
    // No billing, or no Stripe customer: nothing to cancel, Stripe is never asked.
    assert.strictEqual(await cancelSubscriptionsForDeletion({ username: 'free' }), 0);
    assert.strictEqual(await cancelSubscriptionsForDeletion({ billing: {} }), 0);
    assert.strictEqual(listed.length, 0, 'Stripe is not called for an account without a customer');

    // Live subscriptions are cancelled, ended ones are left alone.
    subscriptions = [
        { id: 'sub_active', status: 'active' },
        { id: 'sub_past_due', status: 'past_due' },
        { id: 'sub_trial', status: 'trialing' },
        { id: 'sub_ended', status: 'canceled' },
        { id: 'sub_expired', status: 'incomplete_expired' },
    ];
    const count = await cancelSubscriptionsForDeletion({ billing: { customerId: 'cus_1' } });
    assert.strictEqual(count, 3);
    assert.deepStrictEqual(cancelled.sort(), ['sub_active', 'sub_past_due', 'sub_trial']);
    assert.strictEqual(listed[0].customer, 'cus_1');
    assert.strictEqual(listed[0].status, 'all', 'a past-due or unpaid subscription is found too');

    // Stripe fails: the error reaches the caller.
    failList = true;
    await assert.rejects(() => cancelSubscriptionsForDeletion({ billing: { customerId: 'cus_1' } }), /Stripe is down/);

    console.log('unit-billing-cancel-on-delete: ok');
    process.exit(0);
})().catch((err) => { console.error(err); process.exit(1); });
