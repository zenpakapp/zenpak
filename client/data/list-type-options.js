// Shared source for List Type and Season values (see CONTEXT.md "List Type" / "Season").
// Both share.vue (tagging a List) and community.vue (filtering by tag) read from
// this single list, so adding a new value never requires editing two files.
// CommonJS (not the ESM used elsewhere in client/data/) so it can be require()'d
// directly by test/unit-*.js scripts on any Node >=22, without relying on
// require(esm) support that only became unflagged by default in later 22.x patches.

const LIST_TYPE_VALUES = [
    { value: 'day-hike', i18nKey: 'list.typeDay' },
    { value: 'weekend', i18nKey: 'list.typeWeekend' },
    { value: 'trek', i18nKey: 'list.typeThru' },
    { value: 'bikepacking', i18nKey: 'list.typeBike' },
];

const SEASON_VALUES = [
    { value: '3-season', i18nKey: 'list.season3' },
    { value: '4-season', i18nKey: 'list.season4' },
    { value: 'spring', i18nKey: 'list.seasonSpring' },
    { value: 'summer', i18nKey: 'list.seasonSummer' },
    { value: 'fall', i18nKey: 'list.seasonFall' },
    { value: 'winter', i18nKey: 'list.seasonWinter' },
];

function toI18nOptions(values, t) {
    return values.map(({ value, i18nKey }) => ({ value, label: t(i18nKey) }));
}

module.exports = { LIST_TYPE_VALUES, SEASON_VALUES, toI18nOptions };
