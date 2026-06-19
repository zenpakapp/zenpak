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
        const { priceId, successUrl, cancelUrl } = req.body || {};
        const validPriceIds = [config.get('stripePriceIdTrail'), config.get('stripePriceIdGuide')].filter(Boolean);

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
                success_url: successUrl || `${deployUrl}/account?billing=success`,
                cancel_url: cancelUrl || `${deployUrl}/account?billing=cancel`,
                allow_promotion_codes: true,
                billing_address_collection: 'required',
                tax_id_collection: { enabled: true },
                consent_collection: { terms_of_service: 'required' },
                metadata: { username: user.username },
            });

            return res.json({ url: session.url });
        } catch (err) {
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
                return_url: `${deployUrl}/account`,
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
            stripeEnabled: stripeEnabled(),
        });
    });
});

module.exports = router;
