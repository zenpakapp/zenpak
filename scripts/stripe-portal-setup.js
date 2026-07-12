'use strict';

// Creates the Stripe Customer Portal configuration for ZenPak.
// Run once per environment (sandbox + live) from the project root:
//   node scripts/stripe-portal-setup.js
// Then paste the printed ID into your local.json / production.json:
//   "stripePortalConfigurationId": "bpc_..."

const config = require('config');
const Stripe = require('stripe');

async function main() {
    const secretKey = config.get('stripeSecretKey');
    if (!secretKey) {
        console.error('stripeSecretKey not configured');
        process.exit(1);
    }

    const stripe = new Stripe(secretKey, { apiVersion: '2024-04-10' });
    const deployUrl = config.get('deployUrl');

    // Collect all configured price IDs (Trail = Kin, Guide = Wayfarer internally)
    const priceIds = [
        config.get('stripePriceIdTrail'),
        config.get('stripePriceIdTrailAnnual'),
        config.get('stripePriceIdGuide'),
        config.get('stripePriceIdGuideAnnual'),
    ].filter(Boolean);

    if (priceIds.length === 0) {
        console.error('No price IDs configured. Set at least stripePriceIdTrail or stripePriceIdGuide.');
        process.exit(1);
    }

    // Deduplicate in case annual and monthly point to the same price
    const uniquePriceIds = [...new Set(priceIds)];

    console.log(`Fetching ${uniquePriceIds.length} price(s) from Stripe...`);
    const prices = await Promise.all(uniquePriceIds.map(id => stripe.prices.retrieve(id)));

    // Group prices by product
    const productMap = new Map();
    for (const price of prices) {
        const productId = typeof price.product === 'string' ? price.product : price.product.id;
        if (!productMap.has(productId)) productMap.set(productId, []);
        productMap.get(productId).push(price.id);
    }

    const products = [...productMap.entries()].map(([product, pricesList]) => ({
        product,
        prices: pricesList,
    }));

    console.log(`Found ${products.length} product(s):`, products.map(p => p.product).join(', '));

    const portalConfig = await stripe.billingPortal.configurations.create({
        business_profile: {
            headline: 'Manage your ZenPak subscription',
            privacy_policy_url: `${deployUrl}/privacy`,
            terms_of_service_url: `${deployUrl}/terms`,
        },
        features: {
            invoice_history: { enabled: true },
            payment_method_update: { enabled: true },
            subscription_cancel: {
                enabled: true,
                mode: 'at_period_end',
                proration_behavior: 'none',
            },
            subscription_update: {
                enabled: true,
                default_allowed_updates: ['price'],
                proration_behavior: 'always_invoice',
                products,
            },
            customer_update: {
                enabled: true,
                allowed_updates: ['email', 'address', 'tax_id'],
            },
        },
    });

    console.log('\n✓ Portal configuration created');
    console.log(`  ID: ${portalConfig.id}`);
    console.log('\nAdd to your hosted config:');
    console.log(`  "stripePortalConfigurationId": "${portalConfig.id}"`);
}

main().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});
