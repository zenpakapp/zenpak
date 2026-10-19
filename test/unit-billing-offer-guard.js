/**
 * Unit test: a plan offered by a moderator survives the billing events of an account.
 * A late Stripe "subscription ended" event for an old subscription, or a Ko-fi donation, must not
 * wipe or downgrade an offer that is still running; a real new subscription takes over from it.
 * Run with: node test/unit-billing-offer-guard.js
 */

'use strict';

process.env.NODE_CONFIG = JSON.stringify({
    environment: 'test',
    stripeSecretKey: '',
    stripeWebhookSecret: '',
    stripePriceIdTrail: 'price_trail_month',
    stripePriceIdTrailAnnual: 'price_trail_annual',
    stripePriceIdGuide: 'price_guide_month',
    stripePriceIdGuideAnnual: 'price_guide_annual',
    kofiWebhookToken: 'token',
    databaseUrl: 'localhost/test',
    deployUrl: 'http://localhost:3000',
});

const assert = require('assert');
const { stubServerModule } = require('./fixtures/list-versions-fixtures.js');

let saves = 0;
stubServerModule('db.js', { users: { save() { saves += 1; return Promise.resolve(); } } });

const { syncKofiBilling, syncUserBilling } = require('../server/billing.js');

const FUTURE = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();
const PAST = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

const withOffer = (end = FUTURE) => ({
    username: 'carol',
    billing: {
        provider: 'comp', plan: 'creator', status: 'active', currentPeriodEnd: end, offeredBy: 'fxbenard',
    },
    library: { entitlements: { plan: 'creator' } },
});
const subscription = (status, priceId = 'price_guide_month') => ({
    id: 'sub_9',
    status,
    cancel_at_period_end: false,
    current_period_end: Math.floor(Date.now() / 1000) + 86400 * 30,
    items: { data: [{ price: { id: priceId } }] },
});

(async () => {
    // A late "subscription ended" for an old subscription leaves a running offer alone.
    let user = withOffer();
    await syncUserBilling(user, null, 'canceled');
    assert.strictEqual(user.library.entitlements.plan, 'creator');
    assert.strictEqual(user.billing.provider, 'comp');
    assert.strictEqual(user.billing.status, 'active');

    // So does a subscription that is not paying (incomplete, canceled, unpaid).
    for (const status of ['incomplete', 'canceled', 'unpaid', 'incomplete_expired']) {
        user = withOffer();
        // eslint-disable-next-line no-await-in-loop
        await syncUserBilling(user, subscription(status), status);
        assert.strictEqual(user.library.entitlements.plan, 'creator', status);
        assert.strictEqual(user.billing.provider, 'comp', status);
    }

    // A real subscription takes over from the offer.
    user = withOffer();
    await syncUserBilling(user, subscription('active', 'price_trail_annual'), 'active');
    assert.strictEqual(user.billing.provider, 'stripe');
    assert.strictEqual(user.library.entitlements.plan, 'supporter');
    assert.strictEqual(user.billing.subscriptionId, 'sub_9');

    // Once the offer has ended, the ordinary path applies again.
    user = withOffer(PAST);
    await syncUserBilling(user, null, 'canceled');
    assert.strictEqual(user.library.entitlements.plan, 'free');

    // An account with no offer is handled as before.
    const plain = { username: 'eve', billing: {}, library: { entitlements: { plan: 'free' } } };
    await syncUserBilling(plain, subscription('active'), 'active');
    assert.strictEqual(plain.library.entitlements.plan, 'creator');
    assert.strictEqual(plain.billing.provider, 'stripe');

    // A Ko-fi donation does not downgrade a Wayfarer offer ...
    user = withOffer();
    const before = saves;
    await syncKofiBilling(user, { amount: 5, donationDate: new Date().toISOString() });
    assert.strictEqual(user.library.entitlements.plan, 'creator');
    assert.strictEqual(user.billing.provider, 'comp');
    assert.strictEqual(saves, before, 'nothing written');

    // ... and still works for an account without one, or once the offer has ended.
    const donor = { username: 'fay', billing: {}, library: { entitlements: { plan: 'free' } } };
    await syncKofiBilling(donor, { amount: 5, donationDate: new Date().toISOString() });
    assert.strictEqual(donor.library.entitlements.plan, 'supporter');
    user = withOffer(PAST);
    await syncKofiBilling(user, { amount: 5, donationDate: new Date().toISOString() });
    assert.strictEqual(user.library.entitlements.plan, 'supporter');

    console.log('ok');
    process.exit(0);
})().catch((error) => { console.error(error); process.exit(1); });
