function canonicalEmail(value) {
    return String(value || '').trim().toLowerCase();
}

function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function emailLookup(value) {
    return { email: { $regex: `^${escapeRegExp(canonicalEmail(value))}$`, $options: 'i' } };
}

module.exports = {
    canonicalEmail,
    emailLookup,
};
