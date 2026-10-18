// Image uploads (avatar, item photos) fail with a code the client can translate, instead of a
// generic "Upload error" that says nothing about what to fix.

// formidable error codes (node_modules/formidable/src/FormidableError.js).
const FORM_ERRORS = {
    1009: { status: 413, code: 'file-too-large' }, // biggerThanTotalMaxFileSize
    1016: { status: 413, code: 'file-too-large' }, // biggerThanMaxFileSize
    1015: { status: 400, code: 'too-many-files' }, // maxFilesExceeded
    1010: { status: 400, code: 'empty-file' }, // noEmptyFiles
    1011: { status: 400, code: 'malformed-upload' }, // missingContentType
    1012: { status: 400, code: 'malformed-upload' }, // malformedMultipart
    1013: { status: 400, code: 'malformed-upload' }, // missingMultipartBoundary
};

const MESSAGES = {
    'file-too-large': 'This image is too large.',
    'too-many-files': 'Please upload one image at a time.',
    'empty-file': 'This file is empty.',
    'malformed-upload': 'The upload could not be read. Please try again.',
    'no-file': 'No image was sent.',
    'unsupported-type': 'This file is not a supported image. Use a PNG, JPG, GIF or WebP file.',
    'invalid-image': 'This image could not be read. Try another file.',
    'storage-unavailable': 'Image uploads are not available right now.',
    'storage-failed': 'We could not store your image right now. Please try again in a moment.',
    'upload-failed': 'The upload failed. Please try again.',
};

// The real type of an image, from its first bytes: the type a browser sends is only a claim.
// SVG is left out on purpose, it can carry scripts.
function detectImageType(buffer) {
    if (!buffer || buffer.length < 4) return null;
    if (buffer[0] === 0x89 && buffer.toString('latin1', 1, 4) === 'PNG') return 'png';
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpeg';
    if (buffer.toString('latin1', 0, 4) === 'GIF8') return 'gif';
    if (buffer.length >= 12 && buffer.toString('latin1', 0, 4) === 'RIFF' && buffer.toString('latin1', 8, 12) === 'WEBP') return 'webp';
    return null;
}

function formFailure(error) {
    return FORM_ERRORS[error && error.code] || { status: 500, code: 'upload-failed' };
}

function storageFailure(error) {
    if (error && error.code === 'not-configured') return { status: 503, code: 'storage-unavailable' };
    // The storage service answered that the file itself is not an image it can use.
    if (error && error.status === 400 && /invalid|unsupported|corrupt/i.test(error.providerMessage || '')) {
        return { status: 422, code: 'invalid-image' };
    }
    return { status: 502, code: 'storage-failed' };
}

function errorBody(code, extra = {}) {
    return { code, message: MESSAGES[code] || MESSAGES['upload-failed'], ...extra };
}

module.exports = {
    detectImageType,
    formFailure,
    storageFailure,
    errorBody,
};
