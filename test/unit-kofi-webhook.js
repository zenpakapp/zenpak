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

// billingEvents stub — tracks saved docs; can be overridden per-test
let billingEventsSaved = [];
let billingEventsSaveError = null;
db.billingEvents = {
    save: async (doc) => {
        if (billingEventsSaveError) throw billingEventsSaveError;
        billingEventsSaved.push(doc);
        return doc;
    },
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

    console.log('\n--- parseKofiPayload NaN guard ---');
    const nanPayload = parseKofiPayload(JSON.stringify({
        verification_token: 'secret-token-123',
        email: 'a@b.com',
        amount: 'not-a-number',
        kofi_transaction_id: 'tx-nan',
    }));
    assert('non-numeric amount → amountCents 0', nanPayload.amountCents === 0);

    const missingAmount = parseKofiPayload(JSON.stringify({
        verification_token: 'secret-token-123',
        email: 'a@b.com',
        kofi_transaction_id: 'tx-missing',
    }));
    assert('missing amount → amountCents 0', missingAmount.amountCents === 0);

    console.log('\n--- Ko-fi idempotency (duplicate transactionId) ---');
    // Simulate duplicate: billingEvents.save throws code 11000
    billingEventsSaved = [];
    billingEventsSaveError = Object.assign(new Error('duplicate key'), { code: 11000 });

    const express = require('express');
    const app = express();
    app.use(webhookRouter);

    const http = require('http');
    await new Promise((resolve, reject) => {
        const server = http.createServer(app);
        server.listen(0, () => {
            const port = server.address().port;
            const body = `data=${encodeURIComponent(JSON.stringify({
                verification_token: 'secret-token-123',
                email: 'supporter@example.com',
                amount: '5.00',
                kofi_transaction_id: 'dup-tx-001',
                timestamp: '2026-06-29T10:00:00.000Z',
                type: 'Donation',
            }))}`;
            const req = http.request({
                hostname: '127.0.0.1', port, method: 'POST',
                path: '/api/webhooks/kofi',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) },
            }, (res) => {
                let data = '';
                res.on('data', chunk => { data += chunk; });
                res.on('end', () => {
                    try {
                        const json = JSON.parse(data);
                        assert('duplicate → HTTP 200', res.statusCode === 200);
                        assert('duplicate → received:true', json.received === true);
                        assert('duplicate → duplicate:true', json.duplicate === true);
                    } catch (e) {
                        assert('duplicate response parseable', false);
                    }
                    server.close(resolve);
                });
            });
            req.on('error', (e) => { server.close(() => reject(e)); });
            req.write(body);
            req.end();
        });
        server.on('error', reject);
    });

    // Reset for a clean run (first-time, no duplicate)
    billingEventsSaved = [];
    billingEventsSaveError = null;

    await new Promise((resolve, reject) => {
        const server = http.createServer(app);
        server.listen(0, () => {
            const port = server.address().port;
            const body = `data=${encodeURIComponent(JSON.stringify({
                verification_token: 'secret-token-123',
                email: 'supporter@example.com',
                amount: '5.00',
                kofi_transaction_id: 'new-tx-001',
                timestamp: '2026-06-29T10:00:00.000Z',
                type: 'Donation',
            }))}`;
            const req = http.request({
                hostname: '127.0.0.1', port, method: 'POST',
                path: '/api/webhooks/kofi',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) },
            }, (res) => {
                let data = '';
                res.on('data', chunk => { data += chunk; });
                res.on('end', () => {
                    try {
                        const json = JSON.parse(data);
                        assert('first-time → HTTP 200', res.statusCode === 200);
                        assert('first-time → received:true', json.received === true);
                        assert('first-time → no duplicate flag', json.duplicate === undefined);
                        assert('billingEvent saved with kofiTransactionId', billingEventsSaved.some(d => d.kofiTransactionId === 'new-tx-001'));
                    } catch (e) {
                        assert('first-time response parseable', false);
                    }
                    server.close(resolve);
                });
            });
            req.on('error', (e) => { server.close(() => reject(e)); });
            req.write(body);
            req.end();
        });
        server.on('error', reject);
    });

    console.log(`\n${passed} passed, ${failed} failed`);
    if (failed > 0) process.exit(1);
}

run().catch(err => { console.error(err); process.exit(1); });
