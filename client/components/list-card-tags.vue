<template>
    <div v-if="tags.length || list.destination" class="lpListCardTags">
        <slot v-if="list.destination" name="destination">
            <span class="lpListCardTag">
                <icon name="map-pin" class="lpIconCompact" />
                <span class="lpInvisible">{{ $t('list.destination') }} :</span>
                <span>{{ list.destination }}</span>
            </span>
        </slot>
        <span v-for="tag in tags" :key="tag.field" class="lpListCardTag">
            <icon :name="tag.icon" class="lpIconCompact" />
            <span>{{ tag.label }}</span>
        </span>
    </div>
</template>

<script>
import {
    SEASON_VALUES, DURATION_VALUES, LIST_TYPE_VALUES, LEGACY_LIST_TYPE_VALUES,
} from '../data/list-type-options';
import Icon from './icon.vue';

const tagGroups = [
    { field: 'seasons', icon: 'sun', options: SEASON_VALUES },
    { field: 'durations', icon: 'calendar', options: DURATION_VALUES },
    { field: 'listTypes', icon: 'compass', options: [...LIST_TYPE_VALUES, ...LEGACY_LIST_TYPE_VALUES] },
];

const seasonsByGearLevel = new Map([
    ['3-season', ['spring', 'summer', 'fall']],
    ['4-season', ['spring', 'summer', 'fall', 'winter']],
]);

function compactSeasons(seasons) {
    // Keep explicit seasons when they narrow or extend the gear level's coverage.
    const gearLevel = seasons.find((value) => {
        const covered = seasonsByGearLevel.get(value);
        return covered && seasons.length === covered.length + 1
            && covered.every((season) => seasons.includes(season));
    });
    return gearLevel ? [gearLevel] : seasons;
}

export default {
    name: 'ListCardTags',
    components: { Icon },
    props: {
        list: { type: Object, required: true },
        showSeasonDetails: { type: Boolean, default: false },
    },
    computed: {
        tags() {
            return tagGroups.flatMap(({ field, icon, options }) => {
                const stored = this.list[field];
                if (!Array.isArray(stored) || !stored.length) return [];

                const unique = [...new Set(stored)];
                const values = field === 'seasons' && !this.showSeasonDetails ? compactSeasons(unique) : unique;
                const label = values.map((value) => {
                    const option = options.find((entry) => entry.value === value);
                    return option ? this.$t(option.shortI18nKey || option.i18nKey) : value;
                }).join(', ');

                return [{ field, icon, label }];
            });
        },
    },
};
</script>

<style lang="scss">
@import "../css/globals";

.lpListCardTags {
    display: flex;
    flex-wrap: wrap;
    gap: $space-2 $space-12;
}

.lpListCardTag {
    align-items: center;
    color: $color-text-muted;
    display: inline-flex;
    font-size: $fontSize-sm;
    gap: $space-4;
    line-height: $lineHeight-base;
    min-height: 24px;
    min-width: 0;
    overflow-wrap: anywhere;
}
</style>
