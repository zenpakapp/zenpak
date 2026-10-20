/**
 * Unit test: the community tags of a list are four groups, each with its own values. Seasons and
 * gear level come from one list, the activity (`listTypes`) and the duration (`durations`) are two
 * separate lists, so a duration is never mixed with an activity.
 * Run with: node test/unit-list-type-groups.js
 */

'use strict';

const assert = require('assert');
const {
    LIST_TYPE_VALUES, DURATION_VALUES, LEGACY_LIST_TYPE_VALUES, SEASON_VALUES, valuesInGroup, toggleTag,
} = require('../client/data/list-type-options.js');

const values = (list) => list.map((entry) => entry.value);

// Seasons: the four real seasons, apart from the gear level that says "3 seasons" or "4 seasons".
assert.deepStrictEqual(values(valuesInGroup(SEASON_VALUES, 'season')), ['spring', 'summer', 'fall', 'winter']);
assert.deepStrictEqual(values(valuesInGroup(SEASON_VALUES, 'gearLevel')), ['3-season', '4-season']);
assert.strictEqual(
    valuesInGroup(SEASON_VALUES, 'season').length + valuesInGroup(SEASON_VALUES, 'gearLevel').length,
    SEASON_VALUES.length,
);
assert.deepStrictEqual(values(SEASON_VALUES), ['3-season', '4-season', 'spring', 'summer', 'fall', 'winter']);

// Activities: what kind of trip. Durations: how long. Nothing of one is in the other.
assert.deepStrictEqual(values(LIST_TYPE_VALUES), ['hiking', 'trail-running', 'bikepacking', 'via-ferrata', 'travel']);
assert.deepStrictEqual(values(DURATION_VALUES), ['day', 'weekend', 'multi-day', 'long-distance']);
assert.deepStrictEqual(values(LIST_TYPE_VALUES).filter((value) => values(DURATION_VALUES).includes(value)), []);

// Every value has a label key.
[...LIST_TYPE_VALUES, ...DURATION_VALUES, ...SEASON_VALUES].forEach((entry) => {
    assert.ok(entry.i18nKey && entry.i18nKey.startsWith('list.'), entry.value);
});

// The old list types stay readable: the history of a list keeps the value it had.
assert.deepStrictEqual(values(LEGACY_LIST_TYPE_VALUES), ['day-hike', 'weekend', 'trek']);

// Ticking a tag: several can be ticked, except a duration, which replaces the previous one.
assert.deepStrictEqual(toggleTag(['spring'], 'summer', true), ['spring', 'summer']);
assert.deepStrictEqual(toggleTag(['spring', 'summer'], 'spring', false), ['summer']);
assert.deepStrictEqual(toggleTag(['spring'], 'spring', true), ['spring'], 'ticking twice does not duplicate');
assert.deepStrictEqual(toggleTag([], 'day', true, true), ['day']);
assert.deepStrictEqual(toggleTag(['day'], 'weekend', true, true), ['weekend'], 'one duration replaces the other');
assert.deepStrictEqual(toggleTag(['weekend'], 'weekend', false, true), []);
const before = ['spring'];
toggleTag(before, 'summer', true);
assert.deepStrictEqual(before, ['spring'], 'the input is not changed');

// An unknown group is empty rather than an error.
assert.deepStrictEqual(valuesInGroup(SEASON_VALUES, 'nope'), []);

console.log('ok');
