'use strict';

process.env.NODE_CONFIG = JSON.stringify({
    environment: 'test',
    stripeSecretKey: '',
    stripeWebhookSecret: '',
    stripePriceIdTrail: 'price_trail_annual',
    stripePriceIdGuide: 'price_guide_monthly',
    stripePriceIdGuideAnnual: 'price_guide_annual',
    kofiWebhookToken: 'test-token-123',
    databaseUrl: 'localhost/test',
    deployUrl: 'http://localhost:3000',
});

// Stub db before any require
const db = require('../server/db.js');
db.users.save = async () => {};
db.users.findOne = async () => null;

// Stub auth so authenticateUser calls cb with a test user
const authStub = {
    authenticateUser(req, res, cb) { cb(req, res, testUser); },
};
require.cache[require.resolve('../server/auth.js')] = {
    exports: authStub, id: require.resolve('../server/auth.js'),
    filename: require.resolve('../server/auth.js'), loaded: true, children: [], paths: [],
};

// Stub billing.js — stripeEnabled returns true, stripe operations are stubbed
const billingStub = {
    stripeEnabled: () => true,
    getStripe: () => ({
        checkout: {
            sessions: {
                create: async ({ line_items }) => ({ url: `https://checkout.stripe.com/pay/session_${line_items[0].price}` }),
            },
        },
    }),
    getOrCreateCustomer: async () => 'cus_test123',
};
require.cache[require.resolve('../server/billing.js')] = {
    exports: billingStub, id: require.resolve('../server/billing.js'),
    filename: require.resolve('../server/billing.js'), loaded: true, children: [], paths: [],
};

const testUser = {
    username: 'alice',
    billing: {
        plan: 'creator',
        status: 'active',
        cancelAtPeriodEnd: false,
        currentPeriodEnd: '2027-01-01T00:00:00.000Z',
        provider: 'stripe',
        interval: 'year',
    },
    library: { entitlements: { plan: 'creator' } },
};

const router = require('../server/billing-endpoints.js');

let passed = 0; let failed = 0;
function assert(desc, cond) {
    if (cond) { console.log(`  PASS  ${desc}`); passed++; }
    else { console.error(`  FAIL  ${desc}`); failed++; }
}

function makeRes(resolve) {
    const res = {
        _status: 200,
        status(code) { this._status = code; return this; },
        json(data) { resolve({ status: res._status, data }); },
    };
    return res;
}

// billingRequired middleware is the first handler, skip it for POST routes
async function callRoute(method, path, body = {}) {
    const layer = router.stack.find(l => l.route && l.route.path === path && l.route.methods[method]);
    if (!layer) return null;
    const req = { params: {}, query: {}, body };
    const handlers = layer.route.stack;
    return new Promise(resolve => {
        // If there's a billingRequired guard, skip it (it's first) by calling the second handler
        const handle = handlers.length > 1 ? handlers[1].handle : handlers[0].handle;
        handle(req, makeRes(resolve));
    });
}

async function run() {
    // --- GET /me ---
    console.log('\n--- GET /me ---');

    assert('GET /me route exists',
        Boolean(router.stack.find(l => l.route && l.route.path === '/me' && l.route.methods.get)));

    const meResult = await callRoute('get', '/me');
    assert('GET /me returns 200', meResult && meResult.status === 200);
    assert('GET /me returns plan', meResult && meResult.data.plan === 'creator');
    assert('GET /me returns status', meResult && meResult.data.status === 'active');
    assert('GET /me returns interval field', meResult && 'interval' in meResult.data);
    assert('GET /me returns interval value year', meResult && meResult.data.interval === 'year');
    assert('GET /me returns cancelAtPeriodEnd', meResult && meResult.data.cancelAtPeriodEnd === false);
    assert('GET /me returns currentPeriodEnd', meResult && meResult.data.currentPeriodEnd !== undefined);
    assert('GET /me returns provider', meResult && meResult.data.provider === 'stripe');
    assert('GET /me returns stripeEnabled', meResult && typeof meResult.data.stripeEnabled === 'boolean');

    // interval is null when billing has no interval
    const origAuth = authStub.authenticateUser;
    const userNoInterval = { username: 'bob', billing: { plan: 'creator', status: 'active' }, library: {} };
    authStub.authenticateUser = (req, res, cb) => cb(req, res, userNoInterval);
    const meNoInterval = await callRoute('get', '/me');
    assert('GET /me interval is null when not set', meNoInterval && meNoInterval.data.interval === null);
    authStub.authenticateUser = origAuth;

    // --- POST /checkout-session ---
    console.log('\n--- POST /checkout-session ---');

    assert('POST /checkout-session route exists',
        Boolean(router.stack.find(l => l.route && l.route.path === '/checkout-session' && l.route.methods.post)));

    // guide + month → stripePriceIdGuide
    const guideMonthly = await callRoute('post', '/checkout-session', { plan: 'guide', interval: 'month' });
    assert('guide+month uses stripePriceIdGuide', guideMonthly && guideMonthly.data.url && guideMonthly.data.url.includes('price_guide_monthly'));

    // guide + year → stripePriceIdGuideAnnual
    const guideAnnual = await callRoute('post', '/checkout-session', { plan: 'guide', interval: 'year' });
    assert('guide+year uses stripePriceIdGuideAnnual', guideAnnual && guideAnnual.data.url && guideAnnual.data.url.includes('price_guide_annual'));

    // guide + no interval → stripePriceIdGuide (monthly default)
    const guideDefault = await callRoute('post', '/checkout-session', { plan: 'guide' });
    assert('guide+no interval defaults to stripePriceIdGuide', guideDefault && guideDefault.data.url && guideDefault.data.url.includes('price_guide_monthly'));

    // trail → stripePriceIdTrail (interval param ignored)
    const trailYear = await callRoute('post', '/checkout-session', { plan: 'trail', interval: 'year' });
    assert('trail+year uses stripePriceIdTrail', trailYear && trailYear.data.url && trailYear.data.url.includes('price_trail_annual'));

    const trailMonth = await callRoute('post', '/checkout-session', { plan: 'trail', interval: 'month' });
    assert('trail+month still uses stripePriceIdTrail (annual-only)', trailMonth && trailMonth.data.url && trailMonth.data.url.includes('price_trail_annual'));

    // invalid plan → 400
    const badPlan = await callRoute('post', '/checkout-session', { plan: 'premium' });
    assert('unknown plan returns 400', badPlan && badPlan.status === 400);

    // stripePriceIdGuideAnnual is a valid priceId
    const directAnnual = await callRoute('post', '/checkout-session', { priceId: 'price_guide_annual' });
    assert('direct priceId=price_guide_annual is valid', directAnnual && directAnnual.status === 200);

    console.log(`\n${passed} passed, ${failed} failed`);
    process.exit(failed > 0 ? 1 : 0);
}

run().catch(e => { console.error(e); process.exit(1); });
