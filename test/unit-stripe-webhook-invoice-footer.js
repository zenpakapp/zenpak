'use strict';

process.env.NODE_CONFIG = JSON.stringify({
    environment: 'test',
    stripeSecretKey: '',
    stripeWebhookSecret: 'whsec_test',
    stripePriceIdTrail: 'price_trail_annual',
    stripePriceIdGuide: 'price_guide_monthly',
    stripePriceIdGuideAnnual: 'price_guide_annual',
    kofiWebhookToken: 'test-token-123',
    databaseUrl: 'localhost/test',
    deployUrl: 'http://localhost:3000',
});

const db = require('../server/db.js');
db.users.save = async () => {};
db.users.findOne = async () => null;
db.billingEvents.save = async () => {};

let updateInvoiceFooterCalls = [];
const stripeStub = { invoices: {}, customers: {}, subscriptions: {} };

const billingStub = {
    stripeEnabled: () => true,
    getStripe: () => stripeStub,
    syncUserBilling: async () => {},
    syncKofiBilling: async () => {},
    updateInvoiceFooter: async (invoice, stripe) => {
        updateInvoiceFooterCalls.push({ invoice, stripe });
    },
};

require.cache[require.resolve('../server/billing.js')] = {
    exports: billingStub, id: require.resolve('../server/billing.js'),
    filename: require.resolve('../server/billing.js'), loaded: true, children: [], paths: [],
};

const { handleEvent } = require('../server/webhook-handler.js');

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
    console.log('\n--- invoice.created footer update ---');

    await handleEvent({
        type: 'invoice.created',
        data: {
            object: {
                id: 'in_test123',
                customer: 'cus_test123',
                customer_address: { country: 'FR' },
            },
        },
    });

    assert('invoice.created calls updateInvoiceFooter once', updateInvoiceFooterCalls.length === 1);
    assert('invoice.created passes invoice object', updateInvoiceFooterCalls[0].invoice.id === 'in_test123');
    assert('invoice.created passes configured Stripe client', updateInvoiceFooterCalls[0].stripe === stripeStub);

    updateInvoiceFooterCalls = [];
    await handleEvent({
        type: 'invoice.paid',
        data: { object: { id: 'in_paid123', customer: null } },
    });

    assert('other invoice events do not update footer', updateInvoiceFooterCalls.length === 0);

    console.log(`\n${passed} passed, ${failed} failed`);
    process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
    console.error(err);
    process.exit(1);
});
