// CommonJS, unlike its sibling composables: Node's ESM loader requires JSON imports to
// carry a `with { type: 'json' }` attribute this repo's ESLint (ecmaVersion 2020) can't
// parse, and this file must stay require()'able so test/unit-*.js can load it directly.
const weightUtils = require('../utils/weight.js');

const backpackingData = require('../data/templates/3-day-backpacking.json');
const ultralightData = require('../data/templates/weekend-ultralight.json');
const thruHikeData = require('../data/templates/thru-hike-pct.json');
const fourSeasonData = require('../data/templates/4-season-backpacking.json');
const bikepackingData = require('../data/templates/bikepacking.json');
const lightTravelData = require('../data/templates/light-travel.json');
const viaFerrataData = require('../data/templates/via-ferrata.json');
const trailRunningData = require('../data/templates/trail-running.json');

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
        listTypes: ['hiking'],
        durations: ['weekend'],
        seasons: ['3-season', 'summer'],
    },
    {
        id: '3-day-backpacking',
        data: toLibraryData(backpackingData),
        listTypes: ['hiking'],
        durations: ['multi-day'],
        seasons: ['3-season'],
    },
    {
        id: 'thru-hike-pct',
        data: toLibraryData(thruHikeData),
        listTypes: ['hiking'],
        durations: ['long'],
        seasons: ['3-season', 'summer'],
    },
    {
        id: '4-season-backpacking',
        data: toLibraryData(fourSeasonData),
        listTypes: ['hiking'],
        durations: ['multi-day'],
        seasons: ['4-season', 'winter'],
    },
    {
        id: 'bikepacking',
        data: toLibraryData(bikepackingData),
        listTypes: ['bikepacking'],
        durations: ['multi-day'],
        seasons: ['3-season', 'summer'],
    },
    {
        id: 'light-travel',
        data: toLibraryData(lightTravelData),
        listTypes: ['travel'],
        durations: ['multi-day'],
        seasons: ['summer'],
    },
    {
        id: 'via-ferrata',
        data: toLibraryData(viaFerrataData),
        listTypes: ['via-ferrata'],
        durations: ['day'],
        seasons: ['3-season', 'summer'],
    },
    {
        id: 'trail-running',
        data: toLibraryData(trailRunningData),
        listTypes: ['trail-running'],
        durations: ['day'],
        seasons: ['3-season', 'summer'],
    },
];

module.exports = { templates, templateWeightMg };
