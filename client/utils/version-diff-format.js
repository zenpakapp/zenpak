// CommonJS so test/unit-*.js can require it directly.
const weightUtils = require('./weight.js');
const { formatDisplayPrice } = require('./currency.js');
const { LIST_TYPE_VALUES, SEASON_VALUES } = require('../data/list-type-options.js');

const DIFF_LIST_KEYS = ['added', 'removed', 'moved', 'modified', 'categoriesRenamed', 'meta'];
const TAG_VALUES = { seasons: SEASON_VALUES, listTypes: LIST_TYPE_VALUES };
const CHECK_FIELDS = ['consumable', 'worn', 'star'];

// `t` (optional) translates season / list type slugs; without it they stay raw.
function formatDiffValue(field, value, { itemUnit = 'g', currencySymbol = '$', t } = {}) {
    if (field === 'weight') return `${weightUtils.MgToWeight(Number(value) || 0, itemUnit) || 0} ${itemUnit}`;
    if (field === 'price') return formatDisplayPrice(Number(value) || 0, currencySymbol);
    if (CHECK_FIELDS.includes(field)) return value ? '✓' : '—';
    if (Array.isArray(value)) {
        if (!value.length) return '—';
        const known = TAG_VALUES[field];
        if (!known || !t) return value.join(', ');
        return value.map((slug) => {
            const option = known.find((entry) => entry.value === slug);
            return option ? t(option.i18nKey) : slug;
        }).join(', ');
    }
    if (value === undefined || value === null || value === '') return '—';
    return String(value);
}

function isEmptyDiff(diff) {
    if (!diff) return true;
    return DIFF_LIST_KEYS.every((key) => !Array.isArray(diff[key]) || diff[key].length === 0);
}

module.exports = { formatDiffValue, isEmptyDiff };
