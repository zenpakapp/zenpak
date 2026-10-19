/**
 * Unit test: offering a plan to an account (server/plan-offers.js).
 * A moderator can give a creator Wayfarer (or Kin) for a few months. The offer has an end date
 * that nothing else would enforce, so lapsed offers (and lapsed Ko-fi donations, which have the
 * same problem) go back to the free plan. A Stripe subscription is never touched: Stripe's own
 * events end it.
 * Run with: node test/unit-plan-offers.js
 */

'use strict';

const assert = require('assert');
const { stubServerModule } = require('./fixtures/list-versions-fixtures.js');

const queries = [];
const saved = [];
let usersToReturn = [];
stubServerModule('db.js', {
    users: {
        findMany(query) { queries.push(query); return Promise.resolve(usersToReturn); },
        save(user) { saved.push(user); return Promise.resolve(user); },
    },
});

const {
    OFFERABLE_PLANS,
    applyOffer,
    expireLapsedPlan,
    isLapsed,
    isOfferActive,
    revokeOffer,
    sweepLapsedPlans,
} = require('../server/plan-offers.js');

const NOW = new Date('2026-10-19T12:00:00.000Z');
const freeUser = () => ({ username: 'alice', billing: {}, library: { entitlements: { plan: 'free' } } });
const stripeUser = (status) => ({
    username: 'bob',
    billing: {
        provider: 'stripe', subscriptionId: 'sub_1', status, plan: 'supporter', currentPeriodEnd: '2026-11-01T00:00:00.000Z',
    },
    library: { entitlements: { plan: 'supporter' } },
});
const offered = (overrides = {}) => ({
    username: 'carol',
    billing: {
        provider: 'comp', plan: 'creator', status: 'active', currentPeriodEnd: '2027-01-19T12:00:00.000Z', ...overrides,
    },
    library: { entitlements: { plan: 'creator' } },
});

// Only Kin and Wayfarer can be offered.
assert.deepStrictEqual(Object.keys(OFFERABLE_PLANS).sort(), ['creator', 'supporter']);

// Giving Wayfarer for 3 months.
const user = freeUser();
const result = applyOffer(user, {
    plan: 'creator', months: 3, offeredBy: 'fxbenard', now: NOW,
});
assert.strictEqual(user.library.entitlements.plan, 'creator');
assert.strictEqual(user.billing.plan, 'creator');
assert.strictEqual(user.billing.provider, 'comp');
assert.strictEqual(user.billing.status, 'active');
assert.strictEqual(user.billing.currentPeriodEnd, '2027-01-19T12:00:00.000Z', 'three months later');
assert.strictEqual(user.billing.subscriptionId, null);
assert.strictEqual(user.billing.cancelAtPeriodEnd, false);
assert.strictEqual(user.billing.offeredBy, 'fxbenard');
assert.strictEqual(user.billing.offeredAt, NOW.toISOString());
assert.deepStrictEqual(result, { plan: 'creator', currentPeriodEnd: '2027-01-19T12:00:00.000Z' });

// Month lengths: a month is a calendar month, and 31 January + 1 month stays in February.
const january = freeUser();
applyOffer(january, {
    plan: 'supporter', months: 1, offeredBy: 'm', now: new Date('2027-01-31T10:00:00.000Z'),
});
assert.ok(january.billing.currentPeriodEnd.startsWith('2027-02-'), 'does not overflow into March');
assert.strictEqual(january.library.entitlements.plan, 'supporter');

// A new offer replaces an earlier one.
const again = offered({ currentPeriodEnd: '2026-11-01T00:00:00.000Z', plan: 'supporter' });
applyOffer(again, {
    plan: 'creator', months: 6, offeredBy: 'm', now: NOW,
});
assert.strictEqual(again.billing.plan, 'creator');
assert.ok(again.billing.currentPeriodEnd.startsWith('2027-04-19'));

// What is refused.
const refuses = (user_, options, code) => assert.throws(
    () => applyOffer(user_, {
        offeredBy: 'm', now: NOW, plan: 'creator', months: 3, ...options,
    }),
    (error) => error.code === code,
    `${JSON.stringify(options)} -> ${code}`,
);
refuses(freeUser(), { plan: 'free' }, 'invalid-plan');
refuses(freeUser(), { plan: 'admin' }, 'invalid-plan');
refuses(freeUser(), { plan: undefined }, 'invalid-plan');
refuses(freeUser(), { months: 0 }, 'invalid-months');
refuses(freeUser(), { months: 13 }, 'invalid-months');
refuses(freeUser(), { months: 2.5 }, 'invalid-months');
refuses(freeUser(), { months: 'x' }, 'invalid-months');
refuses(freeUser(), { months: undefined }, 'invalid-months');
// A paying subscriber keeps their subscription: nothing is offered on top of it.
['active', 'trialing', 'past_due'].forEach((status) => refuses(stripeUser(status), {}, 'active-subscription'));
// A plan with no end date (given by hand) is permanent: a time-limited offer would shorten it.
const permanent = { username: 'p', library: { entitlements: { plan: 'creator', source: 'manual' } } };
refuses(permanent, {}, 'permanent-plan');
refuses(permanent, { plan: 'supporter' }, 'permanent-plan');
assert.strictEqual(permanent.billing, undefined, 'a refused offer changes nothing');
// A cancelled Stripe subscription does not block an offer.
const cancelled = stripeUser('canceled');
applyOffer(cancelled, {
    plan: 'creator', months: 3, offeredBy: 'm', now: NOW,
});
assert.strictEqual(cancelled.billing.provider, 'comp');
assert.strictEqual(cancelled.library.entitlements.plan, 'creator');

// An offer is active until its end date.
assert.strictEqual(isOfferActive(offered(), NOW), true);
assert.strictEqual(isOfferActive(offered({ currentPeriodEnd: '2026-10-19T11:59:59.000Z' }), NOW), false);
assert.strictEqual(isOfferActive(offered({ status: 'expired' }), NOW), false);
assert.strictEqual(isOfferActive(stripeUser('active'), NOW), false, 'a Stripe plan is not an offer');
assert.strictEqual(isOfferActive(freeUser(), NOW), false);

// Which plans have lapsed: offers and Ko-fi donations, never Stripe, never the free plan.
const lapsedKofi = {
    billing: {
        provider: 'kofi', plan: 'supporter', status: 'active', currentPeriodEnd: '2026-10-01T00:00:00.000Z',
    },
    library: { entitlements: { plan: 'supporter' } },
};
assert.strictEqual(isLapsed(offered({ currentPeriodEnd: '2026-10-19T11:59:59.000Z' }), NOW), true);
assert.strictEqual(isLapsed(lapsedKofi, NOW), true);
assert.strictEqual(isLapsed(offered(), NOW), false, 'still running');
assert.strictEqual(isLapsed(offered({ currentPeriodEnd: null }), NOW), false, 'no end date: left alone');
const lapsedStripe = stripeUser('active');
lapsedStripe.billing.currentPeriodEnd = '2020-01-01T00:00:00.000Z';
assert.strictEqual(isLapsed(lapsedStripe, NOW), false, 'Stripe ends its own subscriptions');
const alreadyFree = offered({ currentPeriodEnd: '2020-01-01T00:00:00.000Z', plan: 'free' });
alreadyFree.library.entitlements.plan = 'free';
assert.strictEqual(isLapsed(alreadyFree, NOW), false);
assert.strictEqual(isLapsed({}, NOW), false);
assert.strictEqual(isLapsed({ billing: {} }, NOW), false);

// A lapsed plan goes back to free, and the account says why.
const lapsed = offered({ currentPeriodEnd: '2026-10-19T11:59:59.000Z' });
assert.strictEqual(expireLapsedPlan(lapsed, NOW), true);
assert.strictEqual(lapsed.library.entitlements.plan, 'free');
assert.strictEqual(lapsed.billing.plan, 'free');
assert.strictEqual(lapsed.billing.status, 'expired');
assert.strictEqual(lapsed.billing.provider, 'comp', 'the source stays, for the record');
assert.strictEqual(expireLapsedPlan(lapsed, NOW), false, 'a second pass does nothing');
const running = offered();
assert.strictEqual(expireLapsedPlan(running, NOW), false);
assert.strictEqual(running.library.entitlements.plan, 'creator');

// The sweep asks the database for the candidates, expires them and saves each one.
(async () => {
    usersToReturn = [
        offered({ currentPeriodEnd: '2026-10-19T11:00:00.000Z' }),
        { ...lapsedKofi, username: 'dave' },
        offered(), // not lapsed after all: the database filter is only a first pass
    ];
    const count = await sweepLapsedPlans(NOW);
    assert.strictEqual(count, 2);
    assert.strictEqual(saved.length, 2);
    assert.deepStrictEqual(saved.map((u) => u.library.entitlements.plan), ['free', 'free']);

    const query = queries[0];
    assert.deepStrictEqual(query['billing.provider'], { $in: ['comp', 'kofi'] });
    assert.deepStrictEqual(query['billing.currentPeriodEnd'], { $lte: NOW.toISOString() });
    assert.deepStrictEqual(query['library.entitlements.plan'], { $ne: 'free' });

    usersToReturn = [];
    assert.strictEqual(await sweepLapsedPlans(NOW), 0);

    // A running offer can be withdrawn: the account goes back to the free plan at once.
    const running = offered();
    assert.strictEqual(revokeOffer(running, { revokedBy: 'm', now: NOW }), 'creator', 'says which plan ended');
    assert.strictEqual(running.library.entitlements.plan, 'free');
    assert.strictEqual(running.billing.plan, 'free');
    assert.strictEqual(running.billing.status, 'revoked');
    assert.strictEqual(running.billing.revokedBy, 'm');
    assert.strictEqual(running.billing.revokedAt, NOW.toISOString());
    assert.strictEqual(isOfferActive(running, NOW), false);

    // What is not an offer is left alone: a free account, a Stripe subscription, a permanent plan,
    // an offer already over.
    const notOffers = {
        free: freeUser(),
        stripe: stripeUser('active'),
        permanent: { username: 'p', library: { entitlements: { plan: 'creator', source: 'manual' } } },
        over: offered({ currentPeriodEnd: '2026-01-01T00:00:00.000Z' }),
    };
    Object.entries(notOffers).forEach(([name, account]) => {
        const before = JSON.stringify(account);
        assert.throws(() => revokeOffer(account, { revokedBy: 'm', now: NOW }), (error) => error.code === 'no-offer', name);
        assert.strictEqual(JSON.stringify(account), before, `${name} is untouched`);
    });

    console.log('ok');
    process.exit(0);
})().catch((error) => { console.error(error); process.exit(1); });
