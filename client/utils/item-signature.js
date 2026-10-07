function normalizeText(value) {
    return (value || '').toLowerCase().trim().replace(/\s+/g, ' ');
}

// Same name, description, brand and rounded weight = same gear, so a copied list merges into the library.
function copiedItemSignature(item) {
    return [
        normalizeText(item.name),
        normalizeText(item.description),
        normalizeText(item.brand),
        Math.round(Number(item.weight) || 0),
    ].join('|');
}

module.exports = { normalizeText, copiedItemSignature };
