'use strict';

process.env.NODE_CONFIG = JSON.stringify({
    environment: 'test',
    stripeSecretKey: 'sk_test_fake_for_signing_only',
    stripeWebhookSecret: 'whsec_test_secret_123',
    stripePriceIdTrail: '',
    stripePriceIdTrailAnnual: 'price_trail_annual',
    stripePriceIdGuide: 'price_guide_monthly',
    stripePriceIdGuideAnnual: 'price_guide_annual',
    kofiWebhookToken: 'unused-in-this-file',
    databaseUrl: 'localhost/test',
    deployUrl: 'http://localhost:3000',
});

const stripe = require('stripe')('sk_test_fake_for_signing_only');

// Stub db before requiring anything that transitively requires it
const db = require('../server/db.js');
let savedUsers = [];
db.users.save = async (user) => { savedUsers.push(user); return user; };
db.users.findOne = async (query) => {
    if (query['billing.customerId'] === 'cus_kin_test') return kinUser;
    if (query['billing.customerId'] === 'cus_wayfarer_test') return wayfarerUser;
    if (query.username === 'alice') return checkoutUser;
    return null;
};
let billingEventsSaved = [];
let billingEventsSaveError = null;
db.billingEvents = {
    save: async (doc) => {
        if (billingEventsSaveError) throw billingEventsSaveError;
        billingEventsSaved.push(doc);
        return doc;
    },
};

const checkoutUser = { username: 'alice', billing: {} };
const kinUser = { username: 'kin-user', billing: { customerId: 'cus_kin_test' }, library: {} };
const wayfarerUser = { username: 'wayfarer-user', billing: { customerId: 'cus_wayfarer_test' }, library: {} };

const realBilling = require('../server/billing.js');

const fakeStripeClient = stripe; // reuse the real webhooks methods (signing/verification)
const subscriptionsById = {}; // populated per-test in Task 2

fakeStripeClient.subscriptions = {
    retrieve: async (id) => {
        if (subscriptionsById[id]) return subscriptionsById[id];
        throw Object.assign(new Error('No such subscription'), { code: 'resource_missing' });
    },
};

const billingStub = {
    stripeEnabled: () => true,
    getStripe: () => fakeStripeClient,
    getOrCreateCustomer: realBilling.getOrCreateCustomer,
    syncUserBilling: realBilling.syncUserBilling,
    syncKofiBilling: realBilling.syncKofiBilling,
    getPlanFromPriceId: realBilling.getPlanFromPriceId,
    getIntervalFromPriceId: realBilling.getIntervalFromPriceId,
};
require.cache[require.resolve('../server/billing.js')] = {
    exports: billingStub, id: require.resolve('../server/billing.js'),
    filename: require.resolve('../server/billing.js'), loaded: true, children: [], paths: [],
};

const webhookRouter = require('../server/webhook-handler.js');

function signEvent(secret, eventObject) {
    const body = Buffer.from(JSON.stringify(eventObject));
    const signature = stripe.webhooks.generateTestHeaderString({ payload: body, secret });
    return { body, signature };
}

function findWebhookHandle() {
    const layer = webhookRouter.stack.find(l => l.route && l.route.path === '/api/webhooks/stripe' && l.route.methods.post);
    // Route has [rawBodyParser, handler] — the handler is the last middleware in the stack.
    return layer.route.stack[layer.route.stack.length - 1].handle;
}

async function postWebhook(body, signature) {
    const handle = findWebhookHandle();
    const req = { headers: { 'stripe-signature': signature }, body };
    return new Promise(resolve => {
        const res = {
            _status: 200,
            status(code) { this._status = code; return this; },
            json(data) { resolve({ status: this._status, data }); },
        };
        handle(req, res);
    });
}

let passed = 0; let failed = 0;
function assert(desc, cond) {
    if (cond) { console.log(`  PASS  ${desc}`); passed++; }
    else { console.error(`  FAIL  ${desc}`); failed++; }
}

async function run() {
    console.log('\n--- Signature verification ---');

    const { body, signature } = signEvent('whsec_test_secret_123', {
        id: 'evt_sig_test_1',
        type: 'checkout.session.completed',
        data: { object: { metadata: { username: 'alice' }, customer: 'cus_new', consent: null } },
    });
    const validResult = await postWebhook(body, signature);
    assert('valid signature accepted (200)', validResult.status === 200);
    assert('valid signature response received:true', validResult.data.received === true);

    const wrongSigResult = await postWebhook(body, 'v1=deadbeef,t=1700000000');
    assert('invalid signature rejected (400)', wrongSigResult.status === 400);

    console.log(`\n${passed} passed, ${failed} failed`);
    process.exit(failed > 0 ? 1 : 0);
}
run().catch(e => { console.error(e); process.exit(1); });
