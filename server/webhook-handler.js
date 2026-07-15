'use strict';

const express = require('express');
const config = require('config');
const router = express.Router();
const { logger } = require('./log.js');
const db = require('./db.js');
const { stripeEnabled, getStripe, syncUserBilling, syncKofiBilling } = require('./billing.js');

// Raw body parser — MUST be applied before express.json() in app.js
router.post(
    '/api/webhooks/stripe',
    express.raw({ type: 'application/json' }),
    async (req, res) => {
        if (!stripeEnabled()) {
            return res.status(503).json({ message: 'Billing not configured' });
        }

        const sig = req.headers['stripe-signature'];
        const webhookSecret = config.get('stripeWebhookSecret');
        let event;

        try {
            event = getStripe().webhooks.constructEvent(req.body, sig, webhookSecret);
        } catch (err) {
            logger.warn('Stripe webhook signature verification failed', { err: err.message });
            return res.status(400).json({ message: `Webhook error: ${err.message}` });
        }

        // Idempotency — drop duplicate events
        try {
            await db.billingEvents.save({ stripeEventId: event.id, type: event.type, processedAt: new Date().toISOString() });
        } catch (err) {
            if (err.code === 11000) {
                return res.json({ received: true, duplicate: true });
            }
            logger.error('Failed to record billing event', { eventId: event.id, err: err.message });
            return res.status(500).json({ message: 'Internal error' });
        }

        try {
            await handleEvent(event);
        } catch (err) {
            logger.error('Billing event handler failed', { eventId: event.id, type: event.type, err: err.message });
            return res.status(500).json({ message: 'Handler failed' });
        }

        return res.json({ received: true });
    }
);

async function handleEvent(event) {
    const { type, data } = event;
    const obj = data.object;

    switch (type) {
        case 'checkout.session.completed': {
            // Store customerId on user — plan activated by subscription.created
            const username = obj.metadata && obj.metadata.username;
            if (!username) return;
            const user = await db.users.findOne({ username });
            if (!user) return;
            if (!user.billing) user.billing = {};
            if (obj.customer) user.billing.customerId = obj.customer;
            user.billing.provider = 'stripe';
            if (obj.consent && obj.consent.terms_of_service === 'accepted') {
                user.billing.termsVersionAccepted = new Date().toISOString().slice(0, 10);
            }
            await db.users.save(user);
            break;
        }

        case 'customer.subscription.created':
        case 'customer.subscription.updated': {
            const user = await findUserByCustomerId(obj.customer);
            if (!user) return;
            // Retrieve fresh to use our pinned API version (2024-04-10) — webhook
            // events arrive in the CLI/dashboard API version which may omit fields
            // like current_period_end present in older versions.
            const stripe = getStripe();
            const subscription = await stripe.subscriptions.retrieve(obj.id);
            await syncUserBilling(user, subscription, subscription.status);
            break;
        }

        case 'customer.subscription.deleted': {
            const user = await findUserByCustomerId(obj.customer);
            if (!user) return;
            await syncUserBilling(user, null, 'canceled');
            break;
        }

        case 'invoice.paid': {
            const user = await findUserByCustomerId(obj.customer);
            if (!user) return;
            if (obj.subscription) {
                const stripe = getStripe();
                const subscription = await stripe.subscriptions.retrieve(obj.subscription);
                await syncUserBilling(user, subscription, subscription.status);
            } else {
                if (!user.billing) user.billing = {};
                user.billing.lastSyncedAt = new Date().toISOString();
                await db.users.save(user);
            }
            break;
        }

        case 'invoice.payment_failed': {
            const user = await findUserByCustomerId(obj.customer);
            if (!user) return;
            if (!user.billing) user.billing = {};
            user.billing.status = 'past_due';
            user.billing.lastSyncedAt = new Date().toISOString();
            // Do NOT downgrade plan — Stripe retries. Plan stays during grace period.
            await db.users.save(user);
            break;
        }

        default:
            break;
    }
}

async function findUserByCustomerId(customerId) {
    if (!customerId) return null;
    return db.users.findOne({ 'billing.customerId': customerId });
}

function parseKofiPayload(rawData) {
    const parsed = JSON.parse(rawData);
    const rawAmount = parseFloat(parsed.amount || '0');
    const amountCents = isNaN(rawAmount) ? 0 : Math.round(rawAmount * 100);
    return {
        verificationToken: parsed.verification_token || '',
        email: (parsed.email || '').toLowerCase().trim(),
        amountCents,
        donationDate: parsed.timestamp || new Date().toISOString(),
        transactionId: parsed.kofi_transaction_id || '',
        type: parsed.type || '',
    };
}

function validateKofiToken(token) {
    if (!token) return false;
    const expected = config.get('kofiWebhookToken');
    return !!expected && token === expected;
}

router.post(
    '/api/webhooks/kofi',
    express.urlencoded({ extended: false }),
    async (req, res) => {
        const rawData = req.body && req.body.data;
        if (!rawData) {
            return res.status(400).json({ message: 'Missing data field' });
        }

        let payload;
        try {
            payload = parseKofiPayload(rawData);
        } catch (err) {
            logger.warn('Ko-fi webhook parse error', { err: err.message });
            return res.status(400).json({ message: 'Invalid payload' });
        }

        if (!validateKofiToken(payload.verificationToken)) {
            logger.warn('Ko-fi webhook token mismatch');
            return res.status(401).json({ message: 'Invalid token' });
        }

        if (!payload.email) {
            return res.status(400).json({ message: 'Missing email in payload' });
        }

        // Idempotency — drop duplicate Ko-fi notifications
        try {
            await db.billingEvents.save({
                kofiTransactionId: payload.transactionId,
                type: 'kofi_donation',
                processedAt: new Date().toISOString(),
            });
        } catch (err) {
            if (err.code === 11000) {
                return res.json({ received: true, duplicate: true });
            }
            logger.error('Failed to record Ko-fi billing event', { transactionId: payload.transactionId, err: err.message });
            return res.status(500).json({ message: 'Internal error' });
        }

        const user = await db.users.findOne({ email: payload.email });
        if (!user) {
            // Unknown email — acknowledge to Ko-fi, no action
            return res.json({ received: true, matched: false });
        }

        try {
            await syncKofiBilling(user, {
                amount: payload.amountCents,
                donationDate: payload.donationDate,
            });
        } catch (err) {
            logger.error('Ko-fi syncKofiBilling failed', { err: err.message, email: payload.email });
            return res.status(500).json({ message: 'Sync failed' });
        }

        logger.info('Ko-fi Trail activated', { username: user.username, amount: payload.amountCents });
        return res.json({ received: true, matched: true });
    }
);

module.exports = router;
module.exports.parseKofiPayload = parseKofiPayload;
module.exports.validateKofiToken = validateKofiToken;
