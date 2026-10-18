/**
 * Unit test: image uploads fail with a specific code, not a generic "Upload error".
 * server/upload-errors.js turns a form-parsing error, a file that is not an image, or a failed
 * storage call into an HTTP status and a code the client can translate.
 * Run with: node test/unit-upload-errors.js
 */

'use strict';

const assert = require('assert');
const {
    detectImageType,
    formFailure,
    storageFailure,
    errorBody,
} = require('../server/upload-errors.js');

// Real file signatures, not the type the browser claims.
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46]);
const gif = Buffer.from('GIF89a......', 'latin1');
const webp = Buffer.concat([Buffer.from('RIFF'), Buffer.from([1, 2, 3, 4]), Buffer.from('WEBPVP8 ')]);
assert.strictEqual(detectImageType(png), 'png');
assert.strictEqual(detectImageType(jpeg), 'jpeg');
assert.strictEqual(detectImageType(gif), 'gif');
assert.strictEqual(detectImageType(webp), 'webp');
assert.strictEqual(detectImageType(Buffer.from('<html>not an image</html>')), null);
assert.strictEqual(detectImageType(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>')), null, 'SVG can carry scripts');
assert.strictEqual(detectImageType(Buffer.alloc(0)), null);
assert.strictEqual(detectImageType(null), null);

// Form-parsing errors (formidable error codes).
const formError = (code) => Object.assign(new Error('parse'), { code });
assert.deepStrictEqual(formFailure(formError(1016)), { status: 413, code: 'file-too-large' });
assert.deepStrictEqual(formFailure(formError(1009)), { status: 413, code: 'file-too-large' });
assert.deepStrictEqual(formFailure(formError(1015)), { status: 400, code: 'too-many-files' });
assert.deepStrictEqual(formFailure(formError(1010)), { status: 400, code: 'empty-file' });
for (const code of [1011, 1012, 1013]) {
    assert.deepStrictEqual(formFailure(formError(code)), { status: 400, code: 'malformed-upload' });
}
assert.deepStrictEqual(formFailure(formError(1018)), { status: 500, code: 'upload-failed' });
assert.deepStrictEqual(formFailure(new Error('no code')), { status: 500, code: 'upload-failed' });

// Storage (Cloudinary) failures.
const storageError = (props) => Object.assign(new Error('storage'), props);
assert.deepStrictEqual(storageFailure(storageError({ code: 'not-configured' })), { status: 503, code: 'storage-unavailable' });
assert.deepStrictEqual(storageFailure(storageError({ status: 400, providerMessage: 'Invalid image file' })), { status: 422, code: 'invalid-image' });
assert.deepStrictEqual(storageFailure(storageError({ status: 401 })), { status: 502, code: 'storage-failed' });
assert.deepStrictEqual(storageFailure(storageError({ status: 500 })), { status: 502, code: 'storage-failed' });
assert.deepStrictEqual(storageFailure(new Error('network down')), { status: 502, code: 'storage-failed' });

// The response body carries a readable English message and the code to translate.
assert.deepStrictEqual(errorBody('file-too-large', { maxBytes: 2097152 }), {
    code: 'file-too-large',
    message: 'This image is too large.',
    maxBytes: 2097152,
});
assert.strictEqual(errorBody('unsupported-type').code, 'unsupported-type');
assert.ok(errorBody('storage-unavailable').message.length > 10);
assert.ok(errorBody('something-new').message, 'unknown codes still get a message');

console.log('ok');
