'use strict';

process.env.NODE_CONFIG = JSON.stringify({
    environment: 'test',
    stripeSecretKey: '',
    stripeWebhookSecret: '',
    stripePriceIdTrail: 'price_trail_annual',
    stripePriceIdGuide: 'price_guide_monthly',
    stripePriceIdGuideAnnual: 'price_guide_annual',
    kofiWebhookToken: 'test-token-123',
    databaseUrl: 'localhost/test',
    deployUrl: 'http://localhost:3000',
});

// Stub db.users before requiring billing to avoid real DB connections
const db = require('../server/db.js');
db.users.save = async () => {};
db.users.findOne = async () => null;

const billing = require('../server/billing.js');

let passed = 0;
let failed = 0;

function assert(description, condition) {
    if (condition) {
        console.log(`  ✓ ${description}`);
        passed++;
    } else {
        console.error(`  ✗ ${description}`);
        failed++;
    }
}

async function run() {
    console.log('\n--- getPlanFromPriceId ---');
    assert('null → free', billing.getPlanFromPriceId(null) === 'free');
    assert('trail annual → supporter', billing.getPlanFromPriceId('price_trail_annual') === 'supporter');
    assert('guide monthly → creator', billing.getPlanFromPriceId('price_guide_monthly') === 'creator');
    assert('guide annual → creator', billing.getPlanFromPriceId('price_guide_annual') === 'creator');
    assert('unknown → free', billing.getPlanFromPriceId('price_unknown') === 'free');

    console.log('\n--- getIntervalFromPriceId ---');
    assert('null → null', billing.getIntervalFromPriceId(null) === null);
    assert('trail annual → year', billing.getIntervalFromPriceId('price_trail_annual') === 'year');
    assert('guide monthly → month', billing.getIntervalFromPriceId('price_guide_monthly') === 'month');
    assert('guide annual → year', billing.getIntervalFromPriceId('price_guide_annual') === 'year');
    assert('unknown → null', billing.getIntervalFromPriceId('price_unknown') === null);

    console.log('\n--- syncUserBilling interval ---');
    const user1 = { username: 'alice', billing: {} };
    await billing.syncUserBilling(user1, {
        id: 'sub_test1',
        status: 'active',
        cancel_at_period_end: false,
        current_period_end: 1800000000,
        items: { data: [{ price: { id: 'price_guide_annual' } }] },
    }, 'active');
    assert('interval=year for guide-annual', user1.billing.interval === 'year');
    assert('plan=creator for guide-annual', user1.billing.plan === 'creator');

    const user2 = { username: 'bob', billing: {} };
    await billing.syncUserBilling(user2, {
        id: 'sub_test2',
        status: 'active',
        cancel_at_period_end: false,
        current_period_end: 1800000000,
        items: { data: [{ price: { id: 'price_guide_monthly' } }] },
    }, 'active');
    assert('interval=month for guide-monthly', user2.billing.interval === 'month');

    console.log('\n--- syncKofiBilling ---');
    const user3 = { username: 'carol', billing: {} };
    await billing.syncKofiBilling(user3, {
        amount: 500,
        donationDate: '2026-06-29T10:00:00.000Z',
    });
    assert('plan=supporter after kofi', user3.billing.plan === 'supporter');
    assert('provider=kofi after kofi', user3.billing.provider === 'kofi');
    assert('interval=oneshot after kofi', user3.billing.interval === 'oneshot');
    assert('kofiAmount stored', user3.billing.kofiAmount === 500);
    assert('kofiDonationDate stored', user3.billing.kofiDonationDate === '2026-06-29T10:00:00.000Z');
    assert('status=active after kofi', user3.billing.status === 'active');
    const expectedExpiry = new Date('2026-06-29T10:00:00.000Z');
    expectedExpiry.setFullYear(expectedExpiry.getFullYear() + 1);
    assert('currentPeriodEnd = donationDate+1yr', user3.billing.currentPeriodEnd === expectedExpiry.toISOString());
    assert('library.entitlements.plan=supporter', user3.library && user3.library.entitlements && user3.library.entitlements.plan === 'supporter');

    console.log(`\n${passed} passed, ${failed} failed`);
    if (failed > 0) process.exit(1);
}

run().catch(err => { console.error(err); process.exit(1); });
