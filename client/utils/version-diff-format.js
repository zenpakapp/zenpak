// CommonJS so test/unit-*.js can require it directly.
const weightUtils = require('./weight.js');
const { formatDisplayPrice } = require('./currency.js');

const DIFF_LIST_KEYS = ['added', 'removed', 'moved', 'modified', 'categoriesRenamed', 'meta'];

function formatDiffValue(field, value, { itemUnit = 'g', currencySymbol = '$' } = {}) {
    if (field === 'weight') return `${weightUtils.MgToWeight(Number(value) || 0, itemUnit) || 0} ${itemUnit}`;
    if (field === 'price') return formatDisplayPrice(Number(value) || 0, currencySymbol);
    if (field === 'consumable') return value ? '✓' : '—';
    if (Array.isArray(value)) return value.length ? value.join(', ') : '—';
    if (value === undefined || value === null || value === '') return '—';
    return String(value);
}

function isEmptyDiff(diff) {
    if (!diff) return true;
    return DIFF_LIST_KEYS.every((key) => !Array.isArray(diff[key]) || diff[key].length === 0);
}

module.exports = { formatDiffValue, isEmptyDiff };
