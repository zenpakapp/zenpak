/**
 * Unit test: removing a profile photo at the image host. Only a photo this app stored in its avatar
 * folder is ever destroyed; the request is signed the way the host checks it; a refusal comes back
 * to the caller.
 * Run with: node test/unit-avatar-storage.js
 */

'use strict';

process.env.NODE_CONFIG = JSON.stringify({
    environment: 'test',
    cloudinaryCloudName: 'demo-cloud',
    cloudinaryApiKey: 'demo-key',
    cloudinaryApiSecret: 'demo-secret',
});

const assert = require('assert');
const crypto = require('crypto');
const { avatarPublicId, destroyAvatar } = require('../server/avatar-storage.js');

const OURS = 'https://res.cloudinary.com/demo-cloud/image/upload/v1792351260/lighterpack/avatars/y1qftjux.png';

// Which images may be destroyed.
assert.strictEqual(avatarPublicId(OURS, 'demo-cloud'), 'lighterpack/avatars/y1qftjux');
assert.strictEqual(avatarPublicId(OURS.replace('/v1792351260', ''), 'demo-cloud'), 'lighterpack/avatars/y1qftjux', 'without a version');
assert.strictEqual(avatarPublicId('https://res.cloudinary.com/demo-cloud/image/upload/v1/lighterpack/item-photo.png', 'demo-cloud'), '', 'an item image is left alone');
assert.strictEqual(avatarPublicId('https://res.cloudinary.com/other-cloud/image/upload/v1/lighterpack/avatars/a.png', 'demo-cloud'), '', 'another account at the host');
assert.strictEqual(avatarPublicId('https://lh3.googleusercontent.com/a/photo=s96-c', 'demo-cloud'), '', 'a Google photo');
assert.strictEqual(avatarPublicId('http://res.cloudinary.com/demo-cloud/image/upload/v1/lighterpack/avatars/a.png', 'demo-cloud'), '', 'not https');
assert.strictEqual(avatarPublicId('https://res.cloudinary.com/demo-cloud/image/upload/v1/lighterpack/avatars/../../secret.png', 'demo-cloud'), '', 'no path tricks');
assert.strictEqual(avatarPublicId('', 'demo-cloud'), '');
assert.strictEqual(avatarPublicId(undefined, 'demo-cloud'), '');

const realFetch = global.fetch;
const requests = [];
let answer = { status: 200, body: { result: 'ok' } };
global.fetch = async (url, options) => {
    const fields = {};
    options.body.forEach((value, key) => { fields[key] = value; });
    requests.push({ url: String(url), fields });
    return new Response(JSON.stringify(answer.body), { status: answer.status, headers: { 'content-type': 'application/json' } });
};

(async () => {
    // A photo of ours: a signed request to destroy it.
    assert.strictEqual(await destroyAvatar(OURS), true);
    assert.strictEqual(requests.length, 1);
    const { url, fields } = requests[0];
    assert.strictEqual(url, 'https://api.cloudinary.com/v1_1/demo-cloud/image/destroy');
    assert.strictEqual(fields.public_id, 'lighterpack/avatars/y1qftjux');
    const expected = crypto.createHash('sha1')
        .update(`public_id=${fields.public_id}&timestamp=${fields.timestamp}demo-secret`)
        .digest('hex');
    assert.strictEqual(fields.signature, expected, 'signed the way the host checks it');
    assert.ok(!Object.values(fields).includes('demo-secret'), 'the secret is never sent');

    // Anything else: no request at all.
    assert.strictEqual(await destroyAvatar('https://lh3.googleusercontent.com/a/photo'), false);
    assert.strictEqual(await destroyAvatar(''), false);
    assert.strictEqual(requests.length, 1, 'the host is not called for what is not ours');

    // The host refuses: the caller hears about it.
    answer = { status: 400, body: { error: { message: 'Invalid signature' } } };
    await assert.rejects(() => destroyAvatar(OURS), /Invalid signature/);

    global.fetch = realFetch;
    console.log('unit-avatar-storage: ok');
    process.exit(0);
})().catch((err) => { console.error(err); process.exit(1); });
