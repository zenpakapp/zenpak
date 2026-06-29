'use strict';

const config = require('config');
const db = require('./db.js');

const LEGAL_ENTITY_VERSION = 'ae-fxbenard-v1';

function stripeEnabled() {
    return config.has('stripeSecretKey') && !!config.get('stripeSecretKey');
}

let _stripe = null;
function getStripe() {
    if (!_stripe) {
        _stripe = require('stripe')(config.get('stripeSecretKey'));
    }
    return _stripe;
}

function getPlanFromPriceId(priceId) {
    if (!priceId) return 'free';
    if (priceId === config.get('stripePriceIdTrail')) return 'supporter';
    if (priceId === config.get('stripePriceIdGuide')) return 'creator';
    if (priceId === config.get('stripePriceIdGuideAnnual')) return 'creator';
    return 'free';
}

function getIntervalFromPriceId(priceId) {
    if (!priceId) return null;
    if (priceId === config.get('stripePriceIdTrail')) return 'year';
    if (priceId === config.get('stripePriceIdGuide')) return 'month';
    if (priceId === config.get('stripePriceIdGuideAnnual')) return 'year';
    return null;
}

async function getOrCreateCustomer(user) {
    if (user.billing && user.billing.customerId) {
        return user.billing.customerId;
    }
    const stripe = getStripe();
    const customer = await stripe.customers.create({
        email: user.email || undefined,
        metadata: { username: user.username },
    });
    if (!user.billing) user.billing = {};
    user.billing.customerId = customer.id;
    user.billing.provider = 'stripe';
    await db.users.save(user);
    return customer.id;
}

async function syncUserBilling(user, subscription, status) {
    if (!user.billing) user.billing = {};

    const existingTermsAccepted = user.billing && user.billing.termsVersionAccepted;

    const now = new Date().toISOString();

    if (!subscription) {
        user.billing.subscriptionId = null;
        user.billing.priceId = null;
        user.billing.plan = 'free';
        user.billing.status = status || 'canceled';
        user.billing.cancelAtPeriodEnd = false;
        user.billing.currentPeriodEnd = null;
        user.billing.lastSyncedAt = now;
        user.billing.legalEntityVersion = LEGAL_ENTITY_VERSION;
        if (existingTermsAccepted) user.billing.termsVersionAccepted = existingTermsAccepted;
        if (!user.library) user.library = {};
        if (!user.library.entitlements) user.library.entitlements = {};
        user.library.entitlements.plan = 'free';
    } else {
        const priceId = subscription.items && subscription.items.data && subscription.items.data[0]
            ? subscription.items.data[0].price.id
            : null;
        const plan = getPlanFromPriceId(priceId);
        const interval = getIntervalFromPriceId(priceId);

        user.billing.provider = 'stripe';
        user.billing.subscriptionId = subscription.id;
        user.billing.priceId = priceId;
        user.billing.interval = interval;
        user.billing.plan = plan;
        user.billing.status = status || subscription.status;
        user.billing.cancelAtPeriodEnd = subscription.cancel_at_period_end || false;
        user.billing.currentPeriodEnd = subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000).toISOString()
            : null;
        user.billing.lastSyncedAt = now;
        user.billing.legalEntityVersion = LEGAL_ENTITY_VERSION;
        if (existingTermsAccepted) user.billing.termsVersionAccepted = existingTermsAccepted;

        if (!user.library) user.library = {};
        if (!user.library.entitlements) user.library.entitlements = {};
        if (['active', 'trialing', 'past_due'].includes(subscription.status)) {
            user.library.entitlements.plan = plan;
        } else {
            user.library.entitlements.plan = 'free';
        }
    }

    await db.users.save(user);
}

async function syncKofiBilling(user, { amount, donationDate }) {
    if (!user.billing) user.billing = {};

    const expiryDate = new Date(donationDate);
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);

    const existingTermsAccepted = user.billing.termsVersionAccepted;

    user.billing.provider = 'kofi';
    user.billing.subscriptionId = null;
    user.billing.priceId = null;
    user.billing.plan = 'supporter';
    user.billing.interval = 'oneshot';
    user.billing.status = 'active';
    user.billing.cancelAtPeriodEnd = false;
    user.billing.currentPeriodEnd = expiryDate.toISOString();
    user.billing.kofiAmount = amount;
    user.billing.kofiDonationDate = donationDate;
    user.billing.lastSyncedAt = new Date().toISOString();
    user.billing.legalEntityVersion = LEGAL_ENTITY_VERSION;
    if (existingTermsAccepted) user.billing.termsVersionAccepted = existingTermsAccepted;

    if (!user.library) user.library = {};
    if (!user.library.entitlements) user.library.entitlements = {};
    user.library.entitlements.plan = 'supporter';

    await db.users.save(user);
}

module.exports = {
    LEGAL_ENTITY_VERSION,
    stripeEnabled,
    getStripe,
    getPlanFromPriceId,
    getIntervalFromPriceId,
    getOrCreateCustomer,
    syncUserBilling,
    syncKofiBilling,
};
