// CommonJS, unlike its sibling composables: Node's ESM loader requires JSON imports to
// carry a `with { type: 'json' }` attribute this repo's ESLint (ecmaVersion 2020) can't
// parse, and this file must stay require()'able so test/unit-*.js can load it directly.
const backpackingData = require('../data/templates/3-day-backpacking.json');
const ultralightData = require('../data/templates/weekend-ultralight.json');
const thruHikeData = require('../data/templates/thru-hike-pct.json');
const fourSeasonData = require('../data/templates/4-season-backpacking.json');

const templates = [
    {
        id: 'weekend-ultralight',
        data: ultralightData,
        listTypes: ['weekend'],
    },
    {
        id: '3-day-backpacking',
        data: backpackingData,
        listTypes: ['weekend'],
    },
    {
        id: 'thru-hike-pct',
        data: thruHikeData,
        listTypes: ['trek'],
    },
    {
        id: '4-season-backpacking',
        data: fourSeasonData,
        listTypes: ['trek'],
    },
];

module.exports = { templates };
