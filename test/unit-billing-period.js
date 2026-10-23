/**
 * Unit test: what the account keeps of a Stripe subscription across its life. The end of the paid
 * period is stored as an ISO date, follows a renewal or an upgrade, and a cancellation is shown
 * as "ends on" until that date, then the account is free. The same date is read whether Stripe
 * puts it on the subscription (older API versions) or on its item (newer ones).
 * Run with: node test/unit-billing-period.js
 */

'use strict';

process.env.NODE_CONFIG = JSON.stringify({
    environment: 'test',
    stripeSecretKey: '',
    stripeWebhookSecret: '',
    stripePriceIdTrail: 'price_trail_monthly',
    stripePriceIdTrailAnnual: 'price_trail_annual',
    stripePriceIdGuide: 'price_guide_monthly',
    stripePriceIdGuideAnnual: 'price_guide_annual',
    kofiWebhookToken: 'test-token-123',
    databaseUrl: 'localhost/test',
    deployUrl: 'http://localhost:3000',
});

const assert = require('assert');
const { stubServerModule } = require('./fixtures/list-versions-fixtures.js');

stubServerModule('db.js', { users: { save: async () => {}, updateOne: async () => ({ matchedCount: 1 }) } });
stubServerModule('public-list-projections.js', { syncUserPublicLists: async () => {} });

const { syncUserBilling } = require('../server/billing.js');

const MAY = 1790000000; // 2026-09-21T14:13:20Z
const JUNE = 1792592000;
const iso = (seconds) => new Date(seconds * 1000).toISOString();

const subscription = (overrides = {}) => ({
    id: 'sub_1',
    status: 'active',
    cancel_at_period_end: false,
    current_period_end: MAY,
    items: { data: [{ price: { id: 'price_trail_monthly' } }] },
    ...overrides,
});

(async () => {
    const user = { username: 'alice', billing: {}, library: { entitlements: { plan: 'free' } } };

    // A new subscription: the plan, the interval and the end of the paid period.
    await syncUserBilling(user, subscription(), 'active');
    assert.strictEqual(user.billing.plan, 'supporter');
    assert.strictEqual(user.billing.interval, 'month');
    assert.strictEqual(user.billing.currentPeriodEnd, iso(MAY), 'the end is an ISO date');
    assert.strictEqual(user.billing.cancelAtPeriodEnd, false);
    assert.strictEqual(user.library.entitlements.plan, 'supporter');

    // A renewal moves the end forward.
    await syncUserBilling(user, subscription({ current_period_end: JUNE }), 'active');
    assert.strictEqual(user.billing.currentPeriodEnd, iso(JUNE));

    // An upgrade changes the plan and keeps the date Stripe gives.
    await syncUserBilling(user, subscription({
        current_period_end: JUNE,
        items: { data: [{ price: { id: 'price_guide_annual' } }] },
    }), 'active');
    assert.strictEqual(user.billing.plan, 'creator');
    assert.strictEqual(user.billing.interval, 'year');
    assert.strictEqual(user.billing.currentPeriodEnd, iso(JUNE));
    assert.strictEqual(user.library.entitlements.plan, 'creator');

    // A cancellation at the end of the period: the plan stays until then, and says when it ends.
    await syncUserBilling(user, subscription({
        current_period_end: JUNE,
        cancel_at_period_end: true,
        items: { data: [{ price: { id: 'price_guide_annual' } }] },
    }), 'active');
    assert.strictEqual(user.billing.cancelAtPeriodEnd, true);
    assert.strictEqual(user.billing.currentPeriodEnd, iso(JUNE), 'the date shown is when it ends');
    assert.strictEqual(user.library.entitlements.plan, 'creator', 'the access lasts until then');
    assert.strictEqual(user.billing.status, 'active');

    // The subscription is over: free, no date, nothing left to cancel.
    await syncUserBilling(user, null, 'canceled');
    assert.strictEqual(user.billing.plan, 'free');
    assert.strictEqual(user.billing.status, 'canceled');
    assert.strictEqual(user.billing.currentPeriodEnd, null);
    assert.strictEqual(user.billing.cancelAtPeriodEnd, false);
    assert.strictEqual(user.billing.subscriptionId, null);
    assert.strictEqual(user.library.entitlements.plan, 'free');

    // A failed payment keeps the plan during Stripe's retries, and keeps the date.
    await syncUserBilling(user, subscription({ status: 'past_due', current_period_end: MAY }), 'past_due');
    assert.strictEqual(user.library.entitlements.plan, 'supporter');
    assert.strictEqual(user.billing.status, 'past_due');
    assert.strictEqual(user.billing.currentPeriodEnd, iso(MAY));

    // A subscription Stripe gave up on (unpaid, ended) is not a paid plan any more.
    await syncUserBilling(user, subscription({ status: 'unpaid' }), 'unpaid');
    assert.strictEqual(user.library.entitlements.plan, 'free');

    // Newer Stripe API versions put the end of the period on the item, not on the subscription:
    // the account must still get its date.
    const modern = { username: 'bob', billing: {}, library: { entitlements: { plan: 'free' } } };
    await syncUserBilling(modern, {
        id: 'sub_2',
        status: 'active',
        cancel_at_period_end: false,
        items: { data: [{ price: { id: 'price_guide_monthly' }, current_period_end: JUNE }] },
    }, 'active');
    assert.strictEqual(modern.billing.currentPeriodEnd, iso(JUNE), 'the date is read from the item');
    assert.strictEqual(modern.billing.plan, 'creator');

    // No date anywhere: none is invented.
    const dateless = { username: 'carol', billing: {}, library: { entitlements: { plan: 'free' } } };
    await syncUserBilling(dateless, subscription({ current_period_end: undefined }), 'active');
    assert.strictEqual(dateless.billing.currentPeriodEnd, null);

    console.log('unit-billing-period OK');
    process.exit(0);
})().catch((error) => { console.error(error); process.exit(1); });
