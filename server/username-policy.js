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

module.exports = {
    RESERVED_USERNAMES,
    isReservedUsername,
    normalizeBrandConfusables,
    normalizeUsername,
};
