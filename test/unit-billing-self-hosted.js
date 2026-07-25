'use strict';

process.env.NODE_CONFIG = JSON.stringify({
    environment: 'test',
    stripeSecretKey: '',
    stripeWebhookSecret: '',
    stripePriceIdTrail: '',
    stripePriceIdTrailAnnual: '',
    stripePriceIdGuide: '',
    stripePriceIdGuideAnnual: '',
    kofiWebhookToken: '',
    databaseUrl: 'localhost/test',
    deployUrl: 'http://localhost:3000',
});

const db = require('../server/db.js');
db.users.save = async (user) => user;
db.users.findOne = async () => null;

const authStub = {
    authenticateUser(req, res, cb) { cb(req, res, { username: 'selfhosted-user', billing: {} }); },
};
require.cache[require.resolve('../server/auth.js')] = {
    exports: authStub, id: require.resolve('../server/auth.js'),
    filename: require.resolve('../server/auth.js'), loaded: true, children: [], paths: [],
};

const billingRouter = require('../server/billing-endpoints.js');
const webhookRouter = require('../server/webhook-handler.js');

let passed = 0; let failed = 0;
function assert(desc, cond) {
    if (cond) { console.log(`  PASS  ${desc}`); passed++; }
    else { console.error(`  FAIL  ${desc}`); failed++; }
}

function callBillingRoute(method, path, body = {}) {
    const layer = billingRouter.stack.find(l => l.route && l.route.path === path && l.route.methods[method]);
    const req = { params: {}, query: {}, body };
    return new Promise(resolve => {
        const res = {
            _status: 200,
            status(code) { this._status = code; return this; },
            json(data) { resolve({ status: this._status, data }); },
        };
        layer.route.stack[0].handle(req, res);
    });
}

function callWebhookRoute() {
    const layer = webhookRouter.stack.find(l => l.route && l.route.path === '/api/webhooks/stripe' && l.route.methods.post);
    const handle = layer.route.stack[layer.route.stack.length - 1].handle;
    const req = { headers: {}, body: Buffer.from('{}') };
    return new Promise(resolve => {
        const res = {
            _status: 200,
            status(code) { this._status = code; return this; },
            json(data) { resolve({ status: this._status, data }); },
        };
        handle(req, res);
    });
}

async function run() {
    console.log('\n--- Self-hosted: Stripe not configured ---');

    const configResult = await callBillingRoute('get', '/config');
    assert('GET /config reports stripeEnabled:false', configResult.data.stripeEnabled === false);

    const checkoutResult = await callBillingRoute('post', '/checkout-session', { plan: 'trail' });
    assert('POST /checkout-session returns 503', checkoutResult.status === 503);
    assert('POST /checkout-session 503 has clear message', typeof checkoutResult.data.message === 'string' && checkoutResult.data.message.length > 0);

    const portalResult = await callBillingRoute('post', '/portal-session', {});
    assert('POST /portal-session returns 503', portalResult.status === 503);

    const webhookResult = await callWebhookRoute();
    assert('POST /api/webhooks/stripe returns 503 when Stripe disabled', webhookResult.status === 503);

    console.log(`\n${passed} passed, ${failed} failed`);
    process.exit(failed > 0 ? 1 : 0);
}
run().catch(e => { console.error(e); process.exit(1); });
