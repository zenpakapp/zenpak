'use strict';

process.env.NODE_CONFIG = JSON.stringify({
    environment: 'test',
    stripeSecretKey: '',
    stripeWebhookSecret: '',
    stripePriceIdTrail: 'price_trail_annual',
    stripePriceIdGuide: 'price_guide_monthly',
    stripePriceIdGuideAnnual: 'price_guide_annual',
    kofiWebhookToken: 'secret-token-123',
    databaseUrl: 'localhost/test',
    deployUrl: 'http://localhost:3000',
});

// Stub db before requiring webhook handler
const db = require('../server/db.js');
db.users.save = async () => {};
db.users.findOne = async (query) => {
    if (query.email === 'supporter@example.com') {
        return { username: 'supporter', email: 'supporter@example.com', billing: {} };
    }
    return null;
};

const webhookRouter = require('../server/webhook-handler.js');
const { parseKofiPayload, validateKofiToken } = webhookRouter;

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
    console.log('\n--- parseKofiPayload ---');
    const rawData = JSON.stringify({
        verification_token: 'secret-token-123',
        type: 'Donation',
        amount: '7.50',
        currency: 'EUR',
        email: 'supporter@example.com',
        timestamp: '2026-06-29T10:00:00.000Z',
        kofi_transaction_id: 'abc-123',
    });

    const parsed = parseKofiPayload(rawData);
    assert('email extracted', parsed.email === 'supporter@example.com');
    assert('amountCents = 750', parsed.amountCents === 750);
    assert('verificationToken extracted', parsed.verificationToken === 'secret-token-123');
    assert('donationDate extracted', parsed.donationDate === '2026-06-29T10:00:00.000Z');
    assert('transactionId extracted', parsed.transactionId === 'abc-123');

    console.log('\n--- validateKofiToken ---');
    assert('valid token → true', validateKofiToken('secret-token-123') === true);
    assert('wrong token → false', validateKofiToken('wrong') === false);
    assert('empty string → false', validateKofiToken('') === false);
    assert('null → false', validateKofiToken(null) === false);

    console.log(`\n${passed} passed, ${failed} failed`);
    if (failed > 0) process.exit(1);
}

run().catch(err => { console.error(err); process.exit(1); });
