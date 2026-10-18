// The sentence shown when an image upload fails: what is wrong, in the user's language.
// The server answers with a code (server/upload-errors.js); a file refused before it is sent
// uses the same codes, so both paths say the same thing.

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];

const MESSAGE_KEYS = {
    'file-too-large': 'tooLarge',
    'unsupported-type': 'unsupportedType',
    'invalid-image': 'invalidImage',
    'empty-file': 'emptyFile',
    'no-file': 'noFile',
    'too-many-files': 'tooManyFiles',
    'malformed-upload': 'malformed',
    'storage-unavailable': 'storageUnavailable',
    'storage-failed': 'storageFailed',
};

// 2097152 -> "2 MB", 2500000 -> "2.4 MB"
export function formatBytes(bytes) {
    const megabytes = Math.round((bytes / (1024 * 1024)) * 10) / 10;
    return `${megabytes} MB`;
}

// `error` is anything with a `code` (and `maxBytes` for a file that is too large): the error
// of a failed request, or `{ code }` built from a check made before sending.
export function uploadErrorMessage(t, error) {
    const key = MESSAGE_KEYS[error && error.code] || 'failed';
    const max = error && error.maxBytes ? formatBytes(error.maxBytes) : '';
    return t(`upload.${key}`, { max });
}

// Checks a file before it is sent. Returns the error to show, or null when it looks fine; the
// server still looks at the real bytes.
export function checkImageFile(file, maxBytes) {
    if (!IMAGE_TYPES.includes(file.type)) return { code: 'unsupported-type' };
    if (file.size === 0) return { code: 'empty-file' };
    if (file.size > maxBytes) return { code: 'file-too-large', maxBytes };
    return null;
}
