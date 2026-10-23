/**
 * Unit test: billing, plan, password and session changes are written field by field, never as a
 * whole-document save that would put back a stale library, password or session.
 * Run with: node test/unit-atomic-user-writes.js
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

const updates = [];
let wholeSaves = 0;
const accounts = {};
stubServerModule('db.js', {
    users: {
        findOne(query, callback) {
            const doc = accounts[query.username] || null;
            if (callback) { callback(null, doc); return undefined; }
            return Promise.resolve(doc);
        },
        save() { wholeSaves += 1; return Promise.resolve(); },
        updateOne(filter, update) { updates.push([filter, update]); return Promise.resolve({ matchedCount: 1 }); },
    },
});
stubServerModule('auth.js', {
    authenticateUser() {},
    authenticateModerator(req, res, callback) { return callback(req, res, { username: 'mod' }); },
    isModerator() { return false; },
});
stubServerModule('public-list-projections.js', { syncUserPublicLists() { return Promise.resolve(); } });

const { saveBilling, savePlanState } = require('../server/user-plan-writes.js');
const moderation = require('../server/moderation-endpoints.js');

function post(path, body) {
    const layer = moderation.stack.find((l) => l.route && l.route.path === path && l.route.methods.post);
    assert.ok(layer, `${path} exists`);
    return new Promise((resolve) => {
        const res = {
            statusCode: 200,
            status(code) { this.statusCode = code; return this; },
            json(data) { resolve({ status: this.statusCode, data }); },
            end() { resolve({ status: this.statusCode }); },
        };
        layer.route.stack[0].handle({ body, params: {}, query: {}, cookies: {}, ip: '1.1.1.1' }, res, () => {});
    });
}

(async () => {
    const user = {
        _id: 'u1',
        password: 'hash',
        token: 'tok',
        library: { lists: [{ id: 1 }], entitlements: { plan: 'creator', other: 'kept' } },
        billing: { provider: 'stripe', customerId: 'cus_1', status: 'active' },
    };

    // Billing alone: nothing else of the account is in the write.
    await saveBilling(user);
    assert.deepStrictEqual(updates[0], [{ _id: 'u1' }, { $set: { billing: user.billing } }]);

    // Billing and plan: the plan only, not the rest of the library.
    await savePlanState(user);
    assert.deepStrictEqual(updates[1], [{ _id: 'u1' }, { $set: { billing: user.billing, 'library.entitlements.plan': 'creator' } }]);

    // No plan on the account: the plan is left alone.
    await savePlanState({ _id: 'u2', billing: { status: 'x' } });
    assert.deepStrictEqual(updates[2], [{ _id: 'u2' }, { $set: { billing: { status: 'x' } } }]);

    // A moderator password reset writes the password only.
    accounts.dana = { _id: 'u3', username: 'dana', password: 'old', token: 'tok', library: { lists: [] } };
    updates.length = 0;
    let result = await post('/moderation/reset-password', { username: 'dana' });
    assert.strictEqual(result.status, 200);
    assert.strictEqual(updates.length, 1);
    assert.deepStrictEqual(updates[0][0], { _id: 'u3' });
    assert.deepStrictEqual(Object.keys(updates[0][1]), ['$set']);
    assert.deepStrictEqual(Object.keys(updates[0][1].$set), ['password']);

    // Clearing a session removes the token only.
    updates.length = 0;
    result = await post('/moderation/clear-session', { username: 'dana' });
    assert.deepStrictEqual(updates[0], [{ _id: 'u3' }, { $unset: { token: '' } }]);

    assert.strictEqual(wholeSaves, 0, 'no whole-document save was made');
    console.log('unit-atomic-user-writes OK');
})().catch((error) => { console.error(error); process.exit(1); });
