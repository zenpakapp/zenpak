// Shared source for gear category ("item type") values.
// The item.category field is a normalized type id drawn from this single list;
// it is no longer a snapshot of the containing category's name.
// CommonJS (like list-type-options.js) so it can be require()'d directly by
// test/unit-*.js scripts and the client models/mutations, and imported by
// .vue components through webpack.

// Each type has a stable id, which is what item.category stores, and a label, which is what
// people read. The label can change without touching saved data; the id must not.
const GEAR_CATEGORY_OPTIONS = [
    { id: 'pack-bags', label: 'Pack & Bags' },
    { id: 'shelter', label: 'Shelter' },
    { id: 'sleep', label: 'Sleep' },
    { id: 'clothing', label: 'Clothing' },
    { id: 'water', label: 'Water' },
    { id: 'food', label: 'Food' },
    { id: 'cook', label: 'Cook' },
    { id: 'navigation', label: 'Navigation' },
    { id: 'safety', label: 'Safety' },
    { id: 'hygiene', label: 'Hygiene' },
    { id: 'electronics', label: 'Electronics' },
    { id: 'essentials', label: 'Essentials' },
    { id: 'other', label: 'Other' },
];

const GEAR_CATEGORY_IDS = GEAR_CATEGORY_OPTIONS.map((option) => option.id);

// The label to show for a stored id; '' for an empty or unknown id.
function gearCategoryLabel(id) {
    const option = GEAR_CATEGORY_OPTIONS.find((candidate) => candidate.id === id);
    return option ? option.label : '';
}

function normalizeGearCategory(value) {
    return String(value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

// Resolve a free-form string (e.g. a CSV/LighterPack category, or a label saved before the types
// had ids) to a type id using fuzzy matching: the normalized text is equal, or
// one normalized text is contained in the other (either direction). Returns ''
// when no type matches.
function resolveGearCategory(value) {
    const normalized = normalizeGearCategory(value);
    if (!normalized) return '';
    const match = GEAR_CATEGORY_OPTIONS.find((option) => {
        const normalizedCategory = normalizeGearCategory(option.label);
        return normalizedCategory === normalized
            || normalizedCategory.includes(normalized)
            || normalized.includes(normalizedCategory);
    });
    return match ? match.id : '';
}

module.exports = {
    GEAR_CATEGORY_OPTIONS, GEAR_CATEGORY_IDS, gearCategoryLabel, resolveGearCategory,
};
