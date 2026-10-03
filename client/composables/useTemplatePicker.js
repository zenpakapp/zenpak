// CommonJS, unlike its sibling composables: Node's ESM loader requires JSON imports to
// carry a `with { type: 'json' }` attribute this repo's ESLint (ecmaVersion 2020) can't
// parse, and this file must stay require()'able so test/unit-*.js can load it directly.
const weightUtils = require('../utils/weight.js');

const backpackingData = require('../data/templates/3-day-backpacking.json');
const ultralightData = require('../data/templates/weekend-ultralight.json');
const thruHikeData = require('../data/templates/thru-hike-pct.json');
const fourSeasonData = require('../data/templates/4-season-backpacking.json');

const SUBTOTAL_WEIGHT_FIELDS = ['subtotalWeight', 'subtotalWornWeight', 'subtotalConsumableWeight'];

// Template JSON is authored in human units (item.authorUnit / totalUnit), but a saved
// library stores every weight in mg, so convert once before the data reaches the store.
function toLibraryData(raw) {
    const data = JSON.parse(JSON.stringify(raw));
    const totalUnit = data.totalUnit || 'oz';
    data.items = (data.items || []).map((item) => ({
        ...item,
        weight: weightUtils.WeightToMg(item.weight || 0, item.authorUnit || totalUnit),
    }));
    data.categories = (data.categories || []).map((category) => {
        const converted = { ...category };
        SUBTOTAL_WEIGHT_FIELDS.forEach((field) => {
            converted[field] = weightUtils.WeightToMg(category[field] || 0, totalUnit);
        });
        return converted;
    });
    return data;
}

function templateWeightMg(templateData) {
    return (templateData.categories || []).reduce((sum, c) => sum + (c.subtotalWeight || 0), 0);
}

const templates = [
    {
        id: 'weekend-ultralight',
        data: toLibraryData(ultralightData),
        listTypes: ['weekend'],
        seasons: ['3-season', 'summer'],
    },
    {
        id: '3-day-backpacking',
        data: toLibraryData(backpackingData),
        listTypes: ['weekend'],
        seasons: ['3-season'],
    },
    {
        id: 'thru-hike-pct',
        data: toLibraryData(thruHikeData),
        listTypes: ['trek'],
        seasons: ['3-season', 'summer'],
    },
    {
        id: '4-season-backpacking',
        data: toLibraryData(fourSeasonData),
        listTypes: ['trek'],
        seasons: ['4-season', 'winter'],
    },
];

module.exports = { templates, templateWeightMg };
