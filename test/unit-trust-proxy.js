/**
 * Unit test: the number of trusted proxies is explicit, and a visitor cannot choose their own
 * address through X-Forwarded-For when none is trusted.
 * Run with: node test/unit-trust-proxy.js
 */

'use strict';

const assert = require('assert');
const express = require('express');
const { resolveTrustProxy } = require('../server/trust-proxy.js');

// Unset: one proxy in production (the documented Caddy), none elsewhere.
assert.strictEqual(resolveTrustProxy(undefined, 'production'), 1);
assert.strictEqual(resolveTrustProxy('', 'production'), 1);
assert.strictEqual(resolveTrustProxy(undefined, 'development'), false);
assert.strictEqual(resolveTrustProxy('  ', 'test'), false);

// Explicit values win over the environment.
assert.strictEqual(resolveTrustProxy('2', 'development'), 2);
assert.strictEqual(resolveTrustProxy(2, 'development'), 2);
assert.strictEqual(resolveTrustProxy('0', 'production'), false);
assert.strictEqual(resolveTrustProxy(0, 'production'), false);
assert.strictEqual(resolveTrustProxy('false', 'production'), false);
assert.strictEqual(resolveTrustProxy('no', 'production'), false);
assert.strictEqual(resolveTrustProxy(false, 'production'), false);
assert.strictEqual(resolveTrustProxy('true', 'development'), true);
assert.strictEqual(resolveTrustProxy(true, 'development'), true);
assert.strictEqual(resolveTrustProxy('loopback', 'production'), 'loopback');
assert.strictEqual(resolveTrustProxy('10.0.0.0/8, 127.0.0.1', 'production'), '10.0.0.0/8, 127.0.0.1');

// What req.ip becomes behind each setting. A visitor sends X-Forwarded-For: 6.6.6.6 and one proxy
// (203.0.113.9 is the real visitor, appended by that proxy).
function addressSeen(setting) {
    const app = express();
    app.set('trust proxy', setting);
    let seen = null;
    app.get('/', (req, res) => { seen = req.ip; res.end(); });
    const layer = app._router.stack.find((l) => l.route && l.route.path === '/');
    const req = Object.create(app.request);
    req.app = app;
    req.headers = { 'x-forwarded-for': '6.6.6.6, 203.0.113.9' };
    req.connection = { remoteAddress: '127.0.0.1' };
    req.socket = req.connection;
    layer.route.stack[0].handle(req, { end() {} }, () => {});
    return seen;
}

assert.strictEqual(addressSeen(resolveTrustProxy('1', 'production')), '203.0.113.9', 'one trusted proxy: the address that proxy saw, not the one the visitor wrote');
assert.strictEqual(addressSeen(resolveTrustProxy('false', 'production')), '127.0.0.1', 'no trusted proxy: the connection address');
assert.strictEqual(addressSeen(true), '6.6.6.6', 'trusting every hop takes the first entry, which the visitor wrote (the old setting)');

console.log('unit-trust-proxy OK');
