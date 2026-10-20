// Shared source for List Type and Season values (see CONTEXT.md "List Type" / "Season").
// Both share.vue (tagging a List) and community.vue (filtering by tag) read from
// this single list, so adding a new value never requires editing two files.
// CommonJS (not the ESM used elsewhere in client/data/) so it can be require()'d
// directly by test/unit-*.js scripts on any Node >=22, without relying on
// require(esm) support that only became unflagged by default in later 22.x patches.

// `group` only decides where a tag is shown in the share dialog (valuesInGroup); the stored
// value is the same whatever the group.
const LIST_TYPE_VALUES = [
    { value: 'day-hike', i18nKey: 'list.typeDay', group: 'duration' },
    { value: 'weekend', i18nKey: 'list.typeWeekend', group: 'duration' },
    { value: 'trek', i18nKey: 'list.typeThru', group: 'duration' },
    { value: 'bikepacking', i18nKey: 'list.typeBike', group: 'activity' },
    { value: 'travel', i18nKey: 'list.typeTravel', group: 'activity' },
];

// "3 seasons" and "4 seasons" are a gear level, not seasons: a 3-season list is a spring,
// summer and fall list.
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

function toI18nOptions(values, t) {
    return values.map(({ value, i18nKey }) => ({ value, label: t(i18nKey) }));
}

module.exports = {
    LIST_TYPE_VALUES, SEASON_VALUES, toI18nOptions, valuesInGroup,
};
