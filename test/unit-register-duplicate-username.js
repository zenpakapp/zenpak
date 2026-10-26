/**
 * Unit test: two registrations of the same name at once. Both pass the lookup, the unique index stops
 * the second, and it must answer "username already exists" (400), not a generic 500.
 * Run with: node test/unit-register-duplicate-username.js
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

let saveError = null;
stubServerModule('db.js', {
    users: {
        find(query, callback) { callback(null, []); },
        save(user, callback) { callback(saveError); },
        updateOne() { return Promise.resolve({ matchedCount: 1 }); },
    },
});

const router = require('../server/auth-endpoints.js');

const layer = router.stack.find((entry) => entry.route && entry.route.path === '/register' && entry.route.methods.post);
const handler = layer.route.stack[layer.route.stack.length - 1].handle;

function register(error) {
    saveError = error;
    return new Promise((resolve) => {
        const res = {
            statusCode: 200,
            status(code) { this.statusCode = code; return this; },
            cookie() {},
            json(body) { resolve({ status: this.statusCode, body }); },
        };
        handler({
            body: { username: 'dupuser', email: 'dup@example.com', password: 'testtest' }, headers: {}, ip: '127.0.0.1',
        }, res);
    });
}

(async () => {
    const username = await register({ code: 11000, message: 'E11000 duplicate key error collection: users index: username_1 dup key' });
    assert.strictEqual(username.status, 400, 'a duplicate name is a 400');
    assert.strictEqual(username.body.errors[0].field, 'username');

    const email = await register({ code: 11000, message: 'E11000 duplicate key error collection: users index: email_1 dup key' });
    assert.strictEqual(email.status, 400);
    assert.strictEqual(email.body.errors[0].field, 'email');

    const other = await register({ code: 1, message: 'disk full' });
    assert.strictEqual(other.status, 500, 'any other failure stays a 500');

    console.log('unit-register-duplicate-username OK');
    process.exit(0);
})();
