const RESERVED_USERNAMES = [
    'admin',
    'api',
    'app',
    'moderator',
    'official',
    'support',
    'www',
    'zenpak',
];

function normalizeUsername(value) {
    return String(value || '')
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[-_\s.]/g, '');
}

function canonicalUsername(value) {
    return String(value || '').trim().toLowerCase();
}

function isValidUsername(value, { maxLength = 32 } = {}) {
    const username = canonicalUsername(value);
    return /^[a-z0-9_]+$/.test(username) && username.length >= 3 && username.length <= maxLength;
}

function normalizeBrandConfusables(value) {
    return normalizeUsername(value)
        .replace(/3/g, 'e')
        .replace(/0/g, 'o')
        .replace(/1/g, 'i')
        .replace(/@/g, 'a');
}

function isReservedUsername(username) {
    const normalized = normalizeUsername(username);
    const brandNormalized = normalizeBrandConfusables(username);

    if (RESERVED_USERNAMES.includes(normalized)) return true;

    return /^zenpa[cgkq]/.test(brandNormalized);
}

function isReservedDisplayName(value) {
    const normalized = normalizeBrandConfusables(value);
    if (!normalized) return false;
    if (['admin', 'api', 'app', 'moderator', 'official', 'support', 'www'].includes(normalized)) return true;
    return /^zenpa[cgkq]/.test(normalized);
}

module.exports = {
    RESERVED_USERNAMES,
    canonicalUsername,
    isReservedDisplayName,
    isReservedUsername,
    isValidUsername,
    normalizeBrandConfusables,
    normalizeUsername,
};
