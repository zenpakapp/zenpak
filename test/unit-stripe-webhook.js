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
        // Simulate Mongo's unique index on stripeEventId, which is what the real
        // webhook handler relies on for idempotency (catches err.code === 11000).
        if (doc.stripeEventId && billingEventsSaved.some(d => d.stripeEventId === doc.stripeEventId)) {
            throw Object.assign(new Error('E11000 duplicate key error'), { code: 11000 });
        }
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

    console.log('\n--- checkout.session.completed ---');

    const checkoutEvt = signEvent('whsec_test_secret_123', {
        id: 'evt_checkout_1',
        type: 'checkout.session.completed',
        data: {
            object: {
                metadata: { username: 'alice' },
                customer: 'cus_alice_new',
                consent: { terms_of_service: 'accepted' },
            },
        },
    });
    await postWebhook(checkoutEvt.body, checkoutEvt.signature);
    assert('checkout.session.completed stores customerId', checkoutUser.billing.customerId === 'cus_alice_new');
    assert('checkout.session.completed sets provider=stripe', checkoutUser.billing.provider === 'stripe');
    assert('checkout.session.completed records TOS acceptance date', typeof checkoutUser.billing.termsVersionAccepted === 'string');

    console.log('\n--- customer.subscription.created (Kin) ---');

    subscriptionsById['sub_kin_1'] = {
        id: 'sub_kin_1',
        status: 'active',
        cancel_at_period_end: false,
        current_period_end: 1900000000,
        items: { data: [{ price: { id: 'price_trail_annual' } }] },
    };
    const kinSubEvt = signEvent('whsec_test_secret_123', {
        id: 'evt_sub_kin_1',
        type: 'customer.subscription.created',
        data: { object: { id: 'sub_kin_1', customer: 'cus_kin_test' } },
    });
    await postWebhook(kinSubEvt.body, kinSubEvt.signature);
    assert('Kin subscription sets billing.plan=supporter', kinUser.billing.plan === 'supporter');
    assert('Kin subscription sets entitlements.plan=supporter', kinUser.library.entitlements.plan === 'supporter');
    assert('Kin subscription status=active', kinUser.billing.status === 'active');

    console.log('\n--- customer.subscription.created (Wayfarer) ---');

    subscriptionsById['sub_wayfarer_1'] = {
        id: 'sub_wayfarer_1',
        status: 'active',
        cancel_at_period_end: false,
        current_period_end: 1900000000,
        items: { data: [{ price: { id: 'price_guide_monthly' } }] },
    };
    const wayfarerSubEvt = signEvent('whsec_test_secret_123', {
        id: 'evt_sub_wayfarer_1',
        type: 'customer.subscription.created',
        data: { object: { id: 'sub_wayfarer_1', customer: 'cus_wayfarer_test' } },
    });
    await postWebhook(wayfarerSubEvt.body, wayfarerSubEvt.signature);
    assert('Wayfarer subscription sets billing.plan=creator', wayfarerUser.billing.plan === 'creator');
    assert('Wayfarer subscription sets entitlements.plan=creator', wayfarerUser.library.entitlements.plan === 'creator');

    console.log('\n--- customer.subscription.deleted (cancellation) ---');

    const cancelEvt = signEvent('whsec_test_secret_123', {
        id: 'evt_cancel_1',
        type: 'customer.subscription.deleted',
        data: { object: { id: 'sub_kin_1', customer: 'cus_kin_test' } },
    });
    await postWebhook(cancelEvt.body, cancelEvt.signature);
    assert('cancellation downgrades billing.plan to free', kinUser.billing.plan === 'free');
    assert('cancellation downgrades entitlements.plan to free', kinUser.library.entitlements.plan === 'free');
    assert('cancellation sets status=canceled', kinUser.billing.status === 'canceled');

    console.log('\n--- invoice.payment_failed ---');

    const failEvt = signEvent('whsec_test_secret_123', {
        id: 'evt_fail_1',
        type: 'invoice.payment_failed',
        data: { object: { customer: 'cus_wayfarer_test' } },
    });
    await postWebhook(failEvt.body, failEvt.signature);
    assert('payment failure sets status=past_due', wayfarerUser.billing.status === 'past_due');
    assert('payment failure does NOT downgrade plan (grace period)', wayfarerUser.billing.plan === 'creator');

    console.log('\n--- Idempotency ---');

    const replayCountBefore = savedUsers.filter(u => u.username === 'kin-user').length;
    const replayResult = await postWebhook(cancelEvt.body, cancelEvt.signature); // same event.id as before: evt_cancel_1
    assert('replayed event returns duplicate:true', replayResult.data.duplicate === true);
    const replayCountAfter = savedUsers.filter(u => u.username === 'kin-user').length;
    assert('replayed event does not re-process (no extra save)', replayCountAfter === replayCountBefore);

    console.log(`\n${passed} passed, ${failed} failed`);
    process.exit(failed > 0 ? 1 : 0);
}
run().catch(e => { console.error(e); process.exit(1); });
