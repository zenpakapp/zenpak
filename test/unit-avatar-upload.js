/**
 * Unit test: the avatar goes from the browser to the image host and back to the profile.
 * The host (Cloudinary) is a stand-in, but the request to it is checked the way the real one checks
 * it: the signed fields, the folder, the square crop. A refusal by the host, and removing the
 * avatar, are covered too.
 * Run with: node test/unit-avatar-upload.js
 */

'use strict';

const CONFIG = {
    environment: 'test',
    stripeSecretKey: '',
    stripeWebhookSecret: '',
    kofiWebhookToken: '',
    databaseUrl: 'localhost/test',
    deployUrl: 'http://localhost:3000',
    cloudinaryCloudName: 'demo-cloud',
    cloudinaryApiKey: 'demo-key',
    cloudinaryApiSecret: 'demo-secret',
};
process.env.NODE_CONFIG = JSON.stringify(CONFIG);

const assert = require('assert');
const crypto = require('crypto');
const express = require('express');
const { stubServerModule } = require('./fixtures/list-versions-fixtures.js');

const user = { _id: 'u1', username: 'alice', library: { publicProfile: { avatarUrl: '' } } };
const saved = [];
const synced = [];
stubServerModule('db.js', {
    users: { save(account) { saved.push(account.library.publicProfile.avatarUrl); return Promise.resolve(account); } },
});
stubServerModule('auth.js', {
    authenticateUser(req, res, callback) { return callback(req, res, user); },
});
stubServerModule('public-list-projections.js', {
    syncUserPublicLists(account) { synced.push(account.username); return Promise.resolve(); },
});

// The image host: records what it is sent, and answers as the test says.
const hostCalls = [];
let hostAnswer = { status: 200, body: { secure_url: 'https://res.cloudinary.com/demo-cloud/image/upload/v1/lighterpack/avatars/abc.png' } };
const realFetch = global.fetch;
global.fetch = async (url, options) => {
    if (!String(url).includes('api.cloudinary.com')) return realFetch(url, options);
    const fields = {};
    options.body.forEach((value, key) => { fields[key] = typeof value === 'string' ? value : `file:${value.size}`; });
    hostCalls.push({ url: String(url), fields });
    return new Response(JSON.stringify(hostAnswer.body), { status: hostAnswer.status, headers: { 'content-type': 'application/json' } });
};

const router = require('../server/profile-endpoints.js');

const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(2048, 1)]);

function sendAvatar(base, { bytes = png, type = 'image/png' } = {}) {
    const form = new FormData();
    form.append('image', new Blob([bytes], { type }), 'me.png');
    return realFetch(`${base}/api/profile/avatar`, { method: 'POST', body: form });
}

(async () => {
    const app = express();
    app.use(router);
    const server = await new Promise((resolve) => { const s = app.listen(0, () => resolve(s)); });
    const base = `http://127.0.0.1:${server.address().port}`;

    // A good image is sent to the host, signed, then its address is kept on the profile.
    let response = await sendAvatar(base);
    let body = await response.json();
    assert.strictEqual(response.status, 200);
    assert.strictEqual(body.avatarUrl, hostAnswer.body.secure_url);
    assert.strictEqual(user.library.publicProfile.avatarUrl, hostAnswer.body.secure_url, 'the profile keeps the address');
    assert.deepStrictEqual(saved, [hostAnswer.body.secure_url]);
    assert.deepStrictEqual(synced, ['alice'], 'public lists are projected again with the new avatar');

    assert.strictEqual(hostCalls.length, 1);
    const { url, fields } = hostCalls[0];
    assert.strictEqual(url, 'https://api.cloudinary.com/v1_1/demo-cloud/image/upload');
    assert.strictEqual(fields.api_key, 'demo-key');
    assert.strictEqual(fields.folder, 'lighterpack/avatars');
    assert.strictEqual(fields.transformation, 'w_200,h_200,c_fill,g_face,q_auto,f_auto', 'a 200 px square, centred on a face');
    assert.ok(fields.file.startsWith('file:'), 'the image itself is sent');

    // The host recomputes this signature: the signed fields, sorted, followed by the secret.
    const expected = crypto.createHash('sha1')
        .update(`folder=${fields.folder}&timestamp=${fields.timestamp}&transformation=${fields.transformation}demo-secret`)
        .digest('hex');
    assert.strictEqual(fields.signature, expected, 'the request is signed the way the host checks it');
    assert.ok(Math.abs(Number(fields.timestamp) - Date.now() / 1000) < 60, 'the timestamp is current');
    assert.ok(!Object.values(fields).includes('demo-secret'), 'the secret is never sent');

    // The host refuses the image: the profile keeps the avatar it had, and the reason is a code.
    hostAnswer = { status: 400, body: { error: { message: 'Invalid image file' } } };
    response = await sendAvatar(base);
    body = await response.json();
    assert.strictEqual(response.status, 422);
    assert.strictEqual(body.code, 'invalid-image');
    assert.strictEqual(user.library.publicProfile.avatarUrl, 'https://res.cloudinary.com/demo-cloud/image/upload/v1/lighterpack/avatars/abc.png');

    hostAnswer = { status: 500, body: { error: { message: 'boom' } } };
    response = await sendAvatar(base);
    assert.strictEqual(response.status, 502);
    assert.strictEqual((await response.json()).code, 'storage-failed');
    assert.strictEqual(saved.length, 1, 'nothing is saved when the host fails');

    // A file that is not an image never reaches the host.
    const callsBefore = hostCalls.length;
    response = await sendAvatar(base, { bytes: Buffer.from('<html>no</html>'), type: 'image/png' });
    assert.strictEqual(response.status, 415);
    assert.strictEqual(hostCalls.length, callsBefore, 'the host is not called');

    // Removing the avatar empties the address.
    response = await realFetch(`${base}/api/profile/avatar`, { method: 'DELETE' });
    assert.strictEqual(response.status, 200);
    assert.strictEqual(user.library.publicProfile.avatarUrl, '');

    server.close();
    console.log('unit-avatar-upload OK');
    process.exit(0);
})().catch((error) => { console.error(error); process.exit(1); });
