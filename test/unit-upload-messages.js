/**
 * Unit test: the sentence shown when an image upload fails (client/utils/upload-errors.js).
 * Run with: node test/unit-upload-messages.js
 */

'use strict';

const assert = require('assert');
const {
    AVATAR_MAX_BYTES,
    checkImageFile,
    formatBytes,
    uploadErrorMessage,
} = require('../client/utils/upload-errors.js');

assert.strictEqual(formatBytes(2 * 1024 * 1024), '2 MB');
assert.strictEqual(formatBytes(5 * 1024 * 1024), '5 MB');
assert.strictEqual(formatBytes(2500000), '2.4 MB');
assert.strictEqual(AVATAR_MAX_BYTES, 2 * 1024 * 1024, 'same limit as the avatar route');

// A file refused before it is sent gets the same codes the server uses.
const file = (type, size) => ({ type, size });
assert.deepStrictEqual(checkImageFile(file('image/png', 1000), AVATAR_MAX_BYTES), null);
assert.deepStrictEqual(checkImageFile(file('image/webp', 1000), AVATAR_MAX_BYTES), null);
assert.deepStrictEqual(checkImageFile(file('application/pdf', 1000), AVATAR_MAX_BYTES), { code: 'unsupported-type' });
assert.deepStrictEqual(checkImageFile(file('', 1000), AVATAR_MAX_BYTES), { code: 'unsupported-type' });
assert.deepStrictEqual(checkImageFile(file('image/png', 0), AVATAR_MAX_BYTES), { code: 'empty-file' });
assert.deepStrictEqual(
    checkImageFile(file('image/png', AVATAR_MAX_BYTES + 1), AVATAR_MAX_BYTES),
    { code: 'file-too-large', maxBytes: AVATAR_MAX_BYTES },
);

// Each code picks its own sentence; the size limit is filled in; anything else is generic.
const t = (key, params) => `${key}|${JSON.stringify(params)}`;
assert.strictEqual(
    uploadErrorMessage(t, { code: 'file-too-large', maxBytes: 2097152 }),
    'upload.tooLarge|{"max":"2 MB"}',
);
assert.ok(uploadErrorMessage(t, { code: 'unsupported-type' }).startsWith('upload.unsupportedType|'));
assert.ok(uploadErrorMessage(t, { code: 'storage-unavailable' }).startsWith('upload.storageUnavailable|'));
assert.ok(uploadErrorMessage(t, { code: 'storage-failed' }).startsWith('upload.storageFailed|'));
assert.ok(uploadErrorMessage(t, { code: 'invalid-image' }).startsWith('upload.invalidImage|'));
assert.ok(uploadErrorMessage(t, { code: 'something-new' }).startsWith('upload.failed|'));
assert.ok(uploadErrorMessage(t, new Error('network down')).startsWith('upload.failed|'));
assert.ok(uploadErrorMessage(t, null).startsWith('upload.failed|'));

console.log('ok');
