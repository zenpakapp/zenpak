/**
 * Unit test: the session cookie lasts the stated 30 days (it was about 6 days by a missing factor).
 * Run with: node test/unit-session-cookie-age.js
 */

'use strict';

process.env.NODE_CONFIG = JSON.stringify({
    environment: 'test',
    stripeSecretKey: '',
    stripeWebhookSecret: '',
    kofiWebhookToken: '',
    databaseUrl: 'localhost/test',
    deployUrl: 'http://localhost:3000',
    moderators: [],
});

const assert = require('assert');
const { stubServerModule } = require('./fixtures/list-versions-fixtures.js');

stubServerModule('db.js', { users: { updateOne() { return Promise.resolve({ matchedCount: 1 }); } } });

const { generateSession, SESSION_MAX_AGE_MS } = require('../server/auth.js');

const DAY = 24 * 60 * 60 * 1000;
assert.strictEqual(SESSION_MAX_AGE_MS, 30 * DAY, 'thirty days, in milliseconds');

const cookies = [];
const res = { cookie(name, value, options) { cookies.push({ name, value, options }); } };
generateSession({}, res, { _id: 'u1' }, () => {
    assert.strictEqual(cookies.length, 1);
    assert.strictEqual(cookies[0].name, 'lp');
    assert.strictEqual(cookies[0].options.maxAge, 30 * DAY, 'the cookie lives thirty days');
    assert.strictEqual(cookies[0].options.httpOnly, true);
    console.log('unit-session-cookie-age OK');
    process.exit(0);
});
