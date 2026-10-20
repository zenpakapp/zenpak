// Shared source for List Type, Duration and Season values (see CONTEXT.md "List Type" / "Season").
// Both share.vue (tagging a List) and community.vue (filtering by tag) read from
// these lists, so adding a new value never requires editing two files.
// CommonJS (not the ESM used elsewhere in client/data/) so it can be require()'d
// directly by test/unit-*.js scripts on any Node >=22, without relying on
// require(esm) support that only became unflagged by default in later 22.x patches.

// What kind of trip. Stored in `listTypes`.
const LIST_TYPE_VALUES = [
    { value: 'hiking', i18nKey: 'list.typeHiking' },
    { value: 'trail-running', i18nKey: 'list.typeTrail' },
    { value: 'bikepacking', i18nKey: 'list.typeBike' },
    { value: 'via-ferrata', i18nKey: 'list.typeViaFerrata' },
    { value: 'travel', i18nKey: 'list.typeTravel' },
];

// How long. Stored in `durations`, apart from the activity so any activity can last any time.
const DURATION_VALUES = [
    { value: 'day', i18nKey: 'list.durationDay' },
    { value: 'weekend', i18nKey: 'list.durationWeekend' },
    { value: 'multi-day', i18nKey: 'list.durationMultiDay' },
    { value: 'long-distance', i18nKey: 'list.durationLongDistance' },
];

// The list types before the activity and the duration were split. A list no longer offers
// them, but a version history keeps the value it had, so they stay readable there.
const LEGACY_LIST_TYPE_VALUES = [
    { value: 'day-hike', i18nKey: 'list.typeDay' },
    { value: 'weekend', i18nKey: 'list.typeWeekend' },
    { value: 'trek', i18nKey: 'list.typeThru' },
];

// `group` only decides where a tag is shown in the share dialog (valuesInGroup); the stored
// value is the same whatever the group. "3 seasons" and "4 seasons" are a gear level, not
// seasons: a 3-season list is a spring, summer and fall list.
const SEASON_VALUES = [
    { value: '3-season', i18nKey: 'list.season3', group: 'gearLevel' },
    { value: '4-season', i18nKey: 'list.season4', group: 'gearLevel' },
    { value: 'spring', i18nKey: 'list.seasonSpring', group: 'season' },
    { value: 'summer', i18nKey: 'list.seasonSummer', group: 'season' },
    { value: 'fall', i18nKey: 'list.seasonFall', group: 'season' },
    { value: 'winter', i18nKey: 'list.seasonWinter', group: 'season' },
];

function valuesInGroup(values, group) {
    return values.filter((entry) => entry.group === group);
}

// The tags of a list after (un)ticking `value`. A `single` choice (the duration) replaces what
// was ticked; the others add to it. The array it is given is not changed.
function toggleTag(selected, value, checked, single = false) {
    if (single) return checked ? [value] : [];
    const without = selected.filter((entry) => entry !== value);
    return checked ? [...without, value] : without;
}

function toI18nOptions(values, t) {
    return values.map(({ value, i18nKey }) => ({ value, label: t(i18nKey) }));
}

module.exports = {
    LIST_TYPE_VALUES, DURATION_VALUES, LEGACY_LIST_TYPE_VALUES, SEASON_VALUES, toI18nOptions, valuesInGroup, toggleTag,
};
