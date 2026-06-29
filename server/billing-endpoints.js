'use strict';

const express = require('express');
const config = require('config');
const router = express.Router();
const auth = require('./auth.js');
const { stripeEnabled, getStripe, getOrCreateCustomer } = require('./billing.js');

function billingRequired(req, res, next) {
    if (!stripeEnabled()) {
        return res.status(503).json({ message: 'Billing not available in self-hosted mode' });
    }
    next();
}

// POST /checkout-session
// Body: { priceId: string, successUrl?: string, cancelUrl?: string }
router.post('/checkout-session', billingRequired, (req, res) => {
    auth.authenticateUser(req, res, async (req, res, user) => {
        const { priceId: bodyPriceId, plan, successUrl, cancelUrl } = req.body || {};

        let priceId = bodyPriceId;
        if (!priceId && plan) {
            const interval = req.body.interval; // 'month' | 'year' | undefined
            if (plan === 'trail') {
                priceId = config.get('stripePriceIdTrail'); // annual-only, interval ignored
            } else if (plan === 'guide') {
                priceId = interval === 'year'
                    ? config.get('stripePriceIdGuideAnnual')
                    : config.get('stripePriceIdGuide');
            }
        }

        const validPriceIds = [
            config.get('stripePriceIdTrail'),
            config.get('stripePriceIdGuide'),
            config.get('stripePriceIdGuideAnnual'),
        ].filter(Boolean);

        if (!priceId || !validPriceIds.includes(priceId)) {
            return res.status(400).json({ message: 'Invalid price ID' });
        }

        try {
            const stripe = getStripe();
            const customerId = await getOrCreateCustomer(user);
            const deployUrl = config.get('deployUrl');

            const session = await stripe.checkout.sessions.create({
                customer: customerId,
                mode: 'subscription',
                line_items: [{ price: priceId, quantity: 1 }],
                success_url: successUrl || `${deployUrl}/?billing=success`,
                cancel_url: cancelUrl || `${deployUrl}/?billing=cancel`,
                allow_promotion_codes: true,
                billing_address_collection: 'required',
                tax_id_collection: { enabled: true },
                customer_update: { name: 'auto', address: 'auto' },

                metadata: { username: user.username },
            });

            return res.json({ url: session.url });
        } catch (err) {
            console.error('checkout-session error:', err.message, err.type, err.code);
            return res.status(500).json({ message: 'Failed to create checkout session' });
        }
    });
});

// POST /portal-session
router.post('/portal-session', billingRequired, (req, res) => {
    auth.authenticateUser(req, res, async (req, res, user) => {
        const customerId = user.billing && user.billing.customerId;
        if (!customerId) {
            return res.status(400).json({ message: 'No billing account found' });
        }

        try {
            const stripe = getStripe();
            const deployUrl = config.get('deployUrl');

            const session = await stripe.billingPortal.sessions.create({
                customer: customerId,
                return_url: `${deployUrl}/?billing=success`,
            });

            return res.json({ url: session.url });
        } catch (err) {
            return res.status(500).json({ message: 'Failed to create portal session' });
        }
    });
});

// GET /me
router.get('/me', (req, res) => {
    auth.authenticateUser(req, res, (req, res, user) => {
        const billing = user.billing || {};
        return res.json({
            plan: billing.plan || (user.library && user.library.entitlements && user.library.entitlements.plan) || 'free',
            status: billing.status || 'free',
            cancelAtPeriodEnd: billing.cancelAtPeriodEnd || false,
            currentPeriodEnd: billing.currentPeriodEnd || null,
            provider: billing.provider || null,
            interval: billing.interval || null,
            stripeEnabled: stripeEnabled(),
        });
    });
});

module.exports = router;
