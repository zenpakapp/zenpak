'use strict';

const express = require('express');
const config = require('config');
const router = express.Router();
const { logger } = require('./log.js');
const db = require('./db.js');
const { stripeEnabled, getStripe, syncUserBilling } = require('./billing.js');

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
            await syncUserBilling(user, obj, obj.status);
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

module.exports = router;
