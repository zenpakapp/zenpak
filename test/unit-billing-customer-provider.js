/**
 * Unit test: creating a Stripe customer for checkout does not change the billing provider, so a
 * plan offered by a moderator or Ko-fi keeps its expiry and can still be revoked until a
 * subscription really pays.
 * Run with: node test/unit-billing-customer-provider.js
 */

'use strict';

process.env.NODE_CONFIG = JSON.stringify({
    environment: 'test',
    stripeSecretKey: 'sk_test_unit',
    stripeWebhookSecret: '',
    kofiWebhookToken: 'token',
    databaseUrl: 'localhost/test',
    deployUrl: 'http://localhost:3000',
});

const assert = require('assert');
const db = require('../server/db.js');

let saved = null;
db.users.save = async (user) => { saved = JSON.parse(JSON.stringify(user)); };
db.users.updateOne = async (filter, update) => { saved = JSON.parse(JSON.stringify({ billing: update.$set.billing })); };

const billing = require('../server/billing.js');

billing.getStripe().customers.create = async () => ({ id: 'cus_new' });

(async () => {
    const user = {
        username: 'kim',
        email: 'kim@example.com',
        billing: { provider: 'kofi', plan: 'supporter', currentPeriodEnd: '2027-01-01T00:00:00.000Z' },
    };
    const customerId = await billing.getOrCreateCustomer(user);
    assert.strictEqual(customerId, 'cus_new');
    assert.strictEqual(saved.billing.customerId, 'cus_new', 'the customer is kept');
    assert.strictEqual(saved.billing.provider, 'kofi', 'the provider is not flipped before any payment');
    assert.strictEqual(saved.billing.currentPeriodEnd, '2027-01-01T00:00:00.000Z', 'the expiry is untouched');

    console.log('unit-billing-customer-provider: ok');
    process.exit(0);
})().catch((err) => { console.error(err); process.exit(1); });
