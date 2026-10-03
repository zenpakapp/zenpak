// Shared source for gear category ("item type") values.
// The item.category field is a normalized type drawn from this single enum;
// it is no longer a snapshot of the containing category's name.
// CommonJS (like list-type-options.js) so it can be require()'d directly by
// test/unit-*.js scripts and the client models/mutations, and imported by
// .vue components through webpack.

const GEAR_CATEGORIES = [
    'Pack & Bags', 'Shelter', 'Sleep', 'Clothing', 'Water', 'Food', 'Cook',
    'Navigation', 'Safety', 'Hygiene', 'Electronics', 'Essentials', 'Other',
];

function normalizeGearCategory(value) {
    return String(value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

// Resolve a free-form string (e.g. a CSV/LighterPack category) to a
// GEAR_CATEGORIES value using fuzzy matching: the normalized text is equal, or
// one normalized text is contained in the other (either direction). Returns ''
// when no category matches.
function resolveGearCategory(value) {
    const normalized = normalizeGearCategory(value);
    if (!normalized) return '';
    const match = GEAR_CATEGORIES.find((category) => {
        const normalizedCategory = normalizeGearCategory(category);
        return normalizedCategory === normalized
            || normalizedCategory.includes(normalized)
            || normalized.includes(normalizedCategory);
    });
    return match || '';
}

module.exports = { GEAR_CATEGORIES, resolveGearCategory };
