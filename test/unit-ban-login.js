/**
 * Unit test: a banned account cannot sign in or keep using its session. The refusal says the
 * account is suspended, and only comes after the right password, so it does not tell a stranger
 * which names are banned.
 * Run with: node test/unit-ban-login.js
 */

'use strict';

process.env.NODE_CONFIG = JSON.stringify({
    environment: 'test',
    stripeSecretKey: '',
    stripeWebhookSecret: '',
    kofiWebhookToken: '',
    databaseUrl: 'localhost/test',
    deployUrl: 'http://localhost:3000',
    moderators: ['mod'],
});

const assert = require('assert');
const bcrypt = require('bcryptjs');
const { stubServerModule } = require('./fixtures/list-versions-fixtures.js');

const accounts = {};
const sessionsStarted = [];
stubServerModule('db.js', {
    users: {
        findOne(query, callback) {
            const found = Object.values(accounts).find((a) => (query.token ? a.token === query.token : a.username === query.username)) || null;
            return callback(null, found);
        },
        updateOne(filter, update) { sessionsStarted.push(update); return Promise.resolve(); },
        save() { return Promise.resolve(); },
    },
});

const { authenticateUser } = require('../server/auth.js');

const hash = bcrypt.hashSync('secret-pass', 4);
accounts.alice = {
    _id: 'a', username: 'alice', password: hash, token: 'tok-alice',
};
accounts.spammer = {
    _id: 's', username: 'spammer', password: hash, token: 'tok-spammer', banned: true,
};

function attempt(req) {
    return new Promise((resolve) => {
        const res = {
            statusCode: 200,
            cookie() {},
            status(code) { this.statusCode = code; return this; },
            json(data) { resolve({ status: this.statusCode, data, reached: false }); },
        };
        authenticateUser({ cookies: {}, body: {}, ...req }, res, (r, s, user) => resolve({ reached: true, user }));
    });
}

(async () => {
    // Somebody in good standing gets in, with a cookie or with a password.
    let result = await attempt({ cookies: { lp: 'tok-alice' } });
    assert.ok(result.reached, 'a normal session works');
    result = await attempt({ body: { username: 'alice', password: 'secret-pass' } });
    assert.ok(result.reached, 'a normal sign-in works');

    // A banned account is refused, whichever way it comes in.
    result = await attempt({ cookies: { lp: 'tok-spammer' } });
    assert.strictEqual(result.reached, false, 'a banned session is cut');
    assert.strictEqual(result.status, 403);
    assert.strictEqual(result.data.code, 'suspended');

    const sessionsBefore = sessionsStarted.length;
    result = await attempt({ body: { username: 'spammer', password: 'secret-pass' } });
    assert.strictEqual(result.reached, false, 'a banned sign-in is refused');
    assert.strictEqual(result.status, 403);
    assert.strictEqual(result.data.code, 'suspended');
    assert.strictEqual(sessionsStarted.length, sessionsBefore, 'no session is started for it');

    // A wrong password gives the usual answer: nothing says the name is banned.
    result = await attempt({ body: { username: 'spammer', password: 'wrong' } });
    assert.strictEqual(result.status, 404);
    assert.strictEqual(result.data.message, 'Invalid username and/or password.');

    console.log('unit-ban-login OK');
    process.exit(0);
})().catch((error) => { console.error(error); process.exit(1); });
