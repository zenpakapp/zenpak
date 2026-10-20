/**
 * Unit test: the community tags of a list are shown in groups (season, gear level, duration,
 * activity) so the share dialog is not one flat block of unrelated checkboxes. Every tag
 * value belongs to exactly one group, and the stored values stay the same.
 * Run with: node test/unit-list-type-groups.js
 */

'use strict';

const assert = require('assert');
const {
    LIST_TYPE_VALUES, SEASON_VALUES, valuesInGroup,
} = require('../client/data/list-type-options.js');

const values = (list) => list.map((entry) => entry.value);

// Seasons: the four real seasons, apart from the gear level that says "3 seasons" or "4 seasons".
assert.deepStrictEqual(values(valuesInGroup(SEASON_VALUES, 'season')), ['spring', 'summer', 'fall', 'winter']);
assert.deepStrictEqual(values(valuesInGroup(SEASON_VALUES, 'gearLevel')), ['3-season', '4-season']);

// List types: how long, and what kind of trip.
assert.deepStrictEqual(values(valuesInGroup(LIST_TYPE_VALUES, 'duration')), ['day-hike', 'weekend', 'trek']);
assert.deepStrictEqual(values(valuesInGroup(LIST_TYPE_VALUES, 'activity')), ['bikepacking', 'travel']);

// Nothing is lost: every value is in a group, and the stored values are unchanged.
assert.strictEqual(
    valuesInGroup(SEASON_VALUES, 'season').length + valuesInGroup(SEASON_VALUES, 'gearLevel').length,
    SEASON_VALUES.length,
);
assert.strictEqual(
    valuesInGroup(LIST_TYPE_VALUES, 'duration').length + valuesInGroup(LIST_TYPE_VALUES, 'activity').length,
    LIST_TYPE_VALUES.length,
);
assert.deepStrictEqual(values(SEASON_VALUES), ['3-season', '4-season', 'spring', 'summer', 'fall', 'winter']);

// An unknown group is empty rather than an error.
assert.deepStrictEqual(valuesInGroup(SEASON_VALUES, 'nope'), []);

console.log('ok');
