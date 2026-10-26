/**
 * Unit test: deleting an account.
 *  - a Google account has no password: it can still be deleted, with its username typed as the confirmation;
 *  - a password account still needs the right password;
 *  - a paying account's subscriptions are cancelled first, and if that fails nothing is deleted.
 * Run with: node test/unit-delete-account-billing.js
 */

'use strict';

const assert = require('assert');
const { ObjectId } = require('mongodb');
const { stubServerModule } = require('./fixtures/list-versions-fixtures.js');

let removed = 0;
let cancelled = [];
let cancelError = null;
let passwordOk = true;
let account;
const quietCollection = { deleteMany() { return Promise.resolve(); } };

stubServerModule('db.js', {
    users: { remove() { removed += 1; } },
    publicLists: quietCollection,
    follows: quietCollection,
    feedEvents: quietCollection,
});
stubServerModule('auth.js', {
    authenticateUser(req, res, next) { next(req, res, account); },
    verifyPassword(username, password) {
        return passwordOk && password === 'right' ? Promise.resolve(account) : Promise.reject(new Error('bad password'));
    },
    generateSession() {},
});
stubServerModule('list-versions.js', { deleteVersionsForOwner: () => Promise.resolve() });
stubServerModule('billing.js', {
    async cancelSubscriptionsForDeletion(user) {
        if (cancelError) throw cancelError;
        if (user.billing && user.billing.customerId) cancelled.push(user.billing.customerId);
        return cancelled.length;
    },
});

const router = require('../server/account-endpoints.js');

const layer = router.stack.find((l) => l.route && l.route.path === '/delete-account' && l.route.methods.post);

function deleteAccount(body) {
    return new Promise((resolve) => {
        const res = {
            statusCode: 200,
            status(code) { this.statusCode = code; return this; },
            json(data) { resolve({ status: this.statusCode, data }); },
        };
        layer.route.stack[0].handle({ body, cookies: {} }, res);
    });
}

function reset(newAccount) {
    account = newAccount;
    removed = 0;
    cancelled = [];
    cancelError = null;
}

(async () => {
    // A Google account: no password, the typed username is the confirmation.
    reset({ _id: new ObjectId(), username: 'gina' });
    let result = await deleteAccount({ username: 'gina', password: '' });
    assert.strictEqual(result.status, 200, 'an account without a password can be deleted');
    assert.strictEqual(removed, 1);

    // ...but only for itself.
    reset({ _id: new ObjectId(), username: 'gina' });
    result = await deleteAccount({ username: 'someone-else', password: '' });
    assert.strictEqual(result.status, 400, 'another username is refused');
    assert.strictEqual(removed, 0, 'nothing was deleted');

    // A password account: the wrong password deletes nothing, the right one does.
    reset({ _id: new ObjectId(), username: 'pat', password: 'hash' });
    result = await deleteAccount({ username: 'pat', password: 'wrong' });
    assert.strictEqual(result.status, 400);
    assert.strictEqual(removed, 0);
    result = await deleteAccount({ username: 'pat', password: 'right' });
    assert.strictEqual(result.status, 200);
    assert.strictEqual(removed, 1);

    // A paying account: its subscriptions are cancelled before the account goes.
    reset({
        _id: new ObjectId(), username: 'sam', password: 'hash', billing: { customerId: 'cus_123', provider: 'stripe' },
    });
    result = await deleteAccount({ username: 'sam', password: 'right' });
    assert.strictEqual(result.status, 200);
    assert.deepStrictEqual(cancelled, ['cus_123'], 'the Stripe subscriptions were cancelled');
    assert.strictEqual(removed, 1);

    // Stripe refuses: the account stays, so it is not left billed without an account.
    reset({
        _id: new ObjectId(), username: 'sam', password: 'hash', billing: { customerId: 'cus_123', provider: 'stripe' },
    });
    cancelError = new Error('Stripe is down');
    result = await deleteAccount({ username: 'sam', password: 'right' });
    assert.strictEqual(result.status, 502, 'a failed cancellation stops the deletion');
    assert.strictEqual(removed, 0, 'nothing was deleted');
    assert.ok(result.data.errors[0].message.includes('not deleted'), 'the person is told why');

    console.log('unit-delete-account-billing: ok');
    process.exit(0);
})().catch((err) => { console.error(err); process.exit(1); });
