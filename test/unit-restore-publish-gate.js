/**
 * Unit test: POST /api/restore applies the same unverified-email publish gate as /saveLibrary.
 * Run with: node test/unit-restore-publish-gate.js
 */

'use strict';

process.env.NODE_CONFIG = JSON.stringify({
    environment: 'test',
    stripeSecretKey: '',
    stripeWebhookSecret: '',
    kofiWebhookToken: '',
    databaseUrl: 'localhost/test',
    deployUrl: 'http://localhost:3000',
});

const assert = require('assert');
const { stubServerModule } = require('./fixtures/list-versions-fixtures.js');

const writes = [];
let caller = null;
stubServerModule('db.js', {
    users: { updateOne(filter, change) { writes.push(change); return Promise.resolve(); } },
});
stubServerModule('auth.js', {
    authenticateUser(req, res, callback) { return callback(req, res, caller); },
    isModerator() { return false; },
});
stubServerModule('public-list-projections.js', { syncUserPublicLists() { return Promise.resolve(); } });

const router = require('../server/library-endpoints.js');

function restore(library) {
    const layer = router.stack.find((l) => l.route && l.route.path === '/api/restore' && l.route.methods.post);
    assert.ok(layer, 'route exists');
    return new Promise((resolve) => {
        const res = {
            statusCode: 200,
            status(code) { this.statusCode = code; return this; },
            json(data) { resolve({ status: this.statusCode, data }); },
        };
        layer.route.stack[0].handle({ body: { library }, cookies: {} }, res);
    });
}

(async () => {
    caller = {
        _id: 'u1', username: 'dana', emailVerified: false, library: { lists: [{ id: 1, visibility: 'private' }] },
    };

    // Unverified: making a list public through restore is refused, and nothing is written.
    let result = await restore({ lists: [{ id: 1, visibility: 'discoverable' }] });
    assert.strictEqual(result.status, 403);
    assert.strictEqual(writes.length, 0);

    // Unverified: restoring lists that stay private works.
    result = await restore({ lists: [{ id: 1, visibility: 'private' }] });
    assert.strictEqual(result.status, 200);
    assert.strictEqual(writes.length, 1);

    // Verified: publishing is allowed.
    caller.emailVerified = true;
    result = await restore({ lists: [{ id: 1, visibility: 'discoverable' }] });
    assert.strictEqual(result.status, 200);

    console.log('unit-restore-publish-gate: ok');
    process.exit(0);
})().catch((err) => { console.error(err); process.exit(1); });
