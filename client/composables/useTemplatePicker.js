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
const categoriesOnlyData = require('../data/templates/categories-only.json');

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
        id: 'categories-only',
        data: toLibraryData(categoriesOnlyData),
        listTypes: [],
        durations: [],
        seasons: [],
    },
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
        id: 'trail-running',
        data: toLibraryData(trailRunningData),
        listTypes: ['trail-running'],
        durations: ['day'],
        seasons: ['3-season', 'summer'],
    },
    {
        id: 'via-ferrata',
        data: toLibraryData(viaFerrataData),
        listTypes: ['via-ferrata'],
        durations: ['day'],
        seasons: ['3-season', 'summer'],
    },
    {
        id: 'light-travel',
        data: toLibraryData(lightTravelData),
        listTypes: ['travel'],
        durations: ['multi-day'],
        seasons: ['summer'],
    },
];

// Shape expected by the `importPublicList` mutation, so a template can be added as one more
// list in an existing library (items already in the library are matched, not duplicated).
function templateToListImport(template, listName, fallbackName) {
    const itemsById = {};
    (template.data.items || []).forEach((item) => {
        itemsById[item.id] = item;
    });
    return {
        listName: String(listName || '').trim() || fallbackName || '',
        keepName: true,
        description: '',
        seasons: [...(template.seasons || [])],
        listTypes: [...(template.listTypes || [])],
        durations: [...(template.durations || [])],
        categories: (template.data.categories || []).map((category) => ({
            name: category.name,
            categoryItems: (category.categoryItems || []).map((entry) => ({
                ...itemsById[entry.itemId],
                qty: entry.qty,
                worn: entry.worn,
                consumable: entry.consumable,
                star: entry.star,
            })),
        })),
    };
}

module.exports = { templates, templateWeightMg, templateToListImport };
