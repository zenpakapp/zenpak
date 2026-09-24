function normalizeTag(value) {
    return String(value || '').trim().toLowerCase();
}

function normalizeTags(tags = [], pendingTag = '') {
    const out = [];
    [...tags, pendingTag].forEach((value) => {
        const tag = normalizeTag(value);
        if (tag && !out.includes(tag)) out.push(tag);
    });
    return out;
}

module.exports = { normalizeTag, normalizeTags };
