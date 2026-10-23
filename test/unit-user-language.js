/**
 * Unit test: the language of an account is kept on the server (POST /api/account/language), so
 * emails and alerts written by the server can speak it.
 * Run with: node test/unit-user-language.js
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

const saved = [];
stubServerModule('db.js', {
    users: {
        save(user, callback) { saved.push(user); if (callback) callback(null); return Promise.resolve(user); },
        updateOne(filter, update) { saved.push(update.$set); return Promise.resolve({ matchedCount: 1 }); },
    },
});
let signedIn = true;
stubServerModule('auth.js', {
    authenticateUser(req, res, callback) {
        if (!signedIn) return res.status(401).json({ message: 'Denied.' });
        return callback(req, res, req.user);
    },
    verifyPassword() { return Promise.resolve(); },
});
stubServerModule('list-versions.js', { deleteVersionsForOwner() { return Promise.resolve(); } });

const { normalizeLanguage, DEFAULT_LANGUAGE } = require('../server/user-language.js');
const router = require('../server/account-endpoints.js');

// Only the four languages of the app are kept; anything else is not a language we can write in.
assert.strictEqual(DEFAULT_LANGUAGE, 'en');
assert.strictEqual(normalizeLanguage('fr'), 'fr');
assert.strictEqual(normalizeLanguage('DE'), 'de');
assert.strictEqual(normalizeLanguage('es-MX'), 'es');
assert.strictEqual(normalizeLanguage(' fr-FR '), 'fr');
assert.strictEqual(normalizeLanguage('it'), null);
assert.strictEqual(normalizeLanguage(''), null);
assert.strictEqual(normalizeLanguage(undefined), null);
assert.strictEqual(normalizeLanguage({ $ne: 1 }), null);

function setLanguage(user, body) {
    const layer = router.stack.find((l) => l.route && l.route.path === '/api/account/language' && l.route.methods.post);
    assert.ok(layer, 'the route exists');
    return new Promise((resolve) => {
        const res = {
            statusCode: 200,
            status(code) { this.statusCode = code; return this; },
            json(data) { resolve({ status: this.statusCode, data }); },
        };
        layer.route.stack[0].handle({ user, body, cookies: {} }, res);
    });
}

(async () => {
    const user = { username: 'alice' };

    let result = await setLanguage(user, { language: 'fr-FR' });
    assert.strictEqual(result.status, 200);
    assert.strictEqual(user.language, 'fr');
    assert.strictEqual(saved.length, 1);

    // The same language again writes nothing.
    result = await setLanguage(user, { language: 'fr' });
    assert.strictEqual(result.status, 200);
    assert.strictEqual(saved.length, 1);

    // An unknown language is refused and the stored one stays.
    result = await setLanguage(user, { language: 'klingon' });
    assert.strictEqual(result.status, 400);
    assert.strictEqual(user.language, 'fr');
    assert.strictEqual(saved.length, 1);

    // Only a signed-in account can set it.
    signedIn = false;
    result = await setLanguage(user, { language: 'de' });
    assert.strictEqual(result.status, 401);
    assert.strictEqual(user.language, 'fr');

    console.log('unit-user-language OK');
    process.exit(0);
})().catch((error) => { console.error(error); process.exit(1); });
