// A plan offered to an account by a moderator (a creator invited to the beta gets Wayfarer for a
// few months), and the end of such plans.
//
// Stripe ends its own subscriptions: its events (cancelled, unpaid) reach billing.js. Nothing
// ends the other plans, whose end date we fix ourselves: an offer, or a Ko-fi donation (a year).
// sweepLapsedPlans sends those back to the free plan once their date has passed.
const db = require('./db.js');
const { syncUserPublicLists } = require('./public-list-projections.js');
const { savePlanState } = require('./user-plan-writes.js');

// Only the paid plans can be offered. Keys are the plan names stored on the account.
const OFFERABLE_PLANS = { supporter: 'Kin', creator: 'Wayfarer' };
const OFFER_PROVIDER = 'comp';
// The sources whose end date is ours to enforce. Stripe is not one of them.
const SELF_ENDED_PROVIDERS = [OFFER_PROVIDER, 'kofi'];
const PAYING_STATUSES = ['active', 'trialing', 'past_due'];
const MIN_MONTHS = 1;
const MAX_MONTHS = 12;

class OfferError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
    }
}

function hasActiveSubscription(user) {
    const billing = user.billing || {};
    return billing.provider === 'stripe' && !!billing.subscriptionId && PAYING_STATUSES.includes(billing.status);
}

// Calendar months: 31 January plus one month is the end of February, not March.
function addMonths(date, months) {
    const result = new Date(date.getTime());
    const day = result.getUTCDate();
    result.setUTCDate(1);
    result.setUTCMonth(result.getUTCMonth() + months);
    const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
    result.setUTCDate(Math.min(day, lastDay));
    return result;
}

function entitlementPlan(user) {
    return (user.library && user.library.entitlements && user.library.entitlements.plan) || 'free';
}

// Gives `plan` for `months` months. Throws an OfferError (with a `code`) when the plan or the
// duration is not allowed, when the account pays for a subscription, or when it holds a plan
// with no end date: an offer never sits on top of a subscription, nor shortens a permanent plan.
function applyOffer(user, {
    plan, months, offeredBy, now = new Date(),
}) {
    if (!Object.prototype.hasOwnProperty.call(OFFERABLE_PLANS, plan)) {
        throw new OfferError('invalid-plan', 'Only Kin and Wayfarer can be offered.');
    }
    if (!Number.isInteger(months) || months < MIN_MONTHS || months > MAX_MONTHS) {
        throw new OfferError('invalid-months', `The duration is ${MIN_MONTHS} to ${MAX_MONTHS} months.`);
    }
    if (hasActiveSubscription(user)) {
        throw new OfferError('active-subscription', 'This account has an active subscription.');
    }
    if (entitlementPlan(user) !== 'free' && !(user.billing && user.billing.currentPeriodEnd)) {
        throw new OfferError('permanent-plan', 'This account has a plan with no end date.');
    }

    const currentPeriodEnd = addMonths(now, months).toISOString();
    user.billing = {
        ...(user.billing || {}),
        provider: OFFER_PROVIDER,
        plan,
        status: 'active',
        interval: 'offer',
        subscriptionId: null,
        priceId: null,
        cancelAtPeriodEnd: false,
        currentPeriodEnd,
        offeredBy,
        offeredAt: now.toISOString(),
    };
    if (!user.library) user.library = {};
    user.library.entitlements = { ...(user.library.entitlements || {}), plan };
    return { plan, currentPeriodEnd };
}

function isOfferActive(user, now = new Date()) {
    const billing = user && user.billing;
    return Boolean(billing)
        && billing.provider === OFFER_PROVIDER
        && billing.status === 'active'
        && Boolean(billing.currentPeriodEnd)
        && new Date(billing.currentPeriodEnd) > now;
}

// A paid plan whose end date is ours and has passed.
function isLapsed(user, now = new Date()) {
    const billing = user && user.billing;
    if (!billing || !SELF_ENDED_PROVIDERS.includes(billing.provider)) return false;
    if (billing.status === 'expired' || !billing.currentPeriodEnd) return false;
    if (entitlementPlan(user) === 'free') return false;
    return new Date(billing.currentPeriodEnd) <= now;
}

// Withdraws a running offer before its date: the account goes back to the free plan at once.
// Returns the plan that ended. Anything that is not a running offer is refused.
function revokeOffer(user, { revokedBy, now = new Date() }) {
    if (!isOfferActive(user, now) || entitlementPlan(user) === 'free') {
        throw new OfferError('no-offer', 'This account has no offered plan to withdraw.');
    }
    const ended = user.billing.plan;
    user.library.entitlements.plan = 'free';
    user.billing.plan = 'free';
    user.billing.status = 'revoked';
    user.billing.revokedBy = revokedBy;
    user.billing.revokedAt = now.toISOString();
    return ended;
}

function expireLapsedPlan(user, now = new Date()) {
    if (!isLapsed(user, now)) return false;
    user.library.entitlements.plan = 'free';
    user.billing.plan = 'free';
    user.billing.status = 'expired';
    user.billing.expiredAt = now.toISOString();
    return true;
}

// Sends every lapsed offer and donation back to the free plan. The query only narrows the
// candidates; each account is checked again. Returns how many were ended.
async function sweepLapsedPlans(now = new Date()) {
    const candidates = await db.users.findMany({
        'billing.provider': { $in: SELF_ENDED_PROVIDERS },
        'billing.currentPeriodEnd': { $lte: now.toISOString() },
        'library.entitlements.plan': { $ne: 'free' },
    });

    let ended = 0;
    // One account at a time: this runs at startup and must not flood the database.
    await candidates.reduce((previous, user) => previous.then(async () => {
        if (!expireLapsedPlan(user, now)) return;
        await savePlanState(user);
        syncUserPublicLists(user).catch(() => {});
        ended += 1;
    }), Promise.resolve());
    return ended;
}

module.exports = {
    MAX_MONTHS,
    OFFERABLE_PLANS,
    OFFER_PROVIDER,
    OfferError,
    applyOffer,
    expireLapsedPlan,
    isLapsed,
    isOfferActive,
    revokeOffer,
    sweepLapsedPlans,
};
