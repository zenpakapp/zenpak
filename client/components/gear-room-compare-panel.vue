<style lang="scss">
@import "../css/_globals";

.lpGearRoomComparePanel {
    background: $color-surface;
    border-top: 1px solid $color-border;
    bottom: 0;
    box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.14);
    display: flex;
    flex-direction: column;
    height: 50vh;
    left: 0;
    overflow: hidden;
    position: fixed;
    right: 0;
    transform: translateY(100%);
    transition: transform 0.25s ease;
    z-index: $belowDialog;

    &.lpGearRoomComparePanel--open {
        transform: translateY(0);
    }
}

.lpGearRoomCompareHeader {
    align-items: center;
    background: $color-surface;
    border-bottom: 1px solid $color-border;
    display: flex;
    flex-shrink: 0;
    gap: 12px;
    padding: 10px 16px;
}

.lpGearRoomCompareTitle {
    flex: 1;
    font-size: $fontSize-md;
    font-weight: $fontWeight-bold;
}

.lpGearRoomCompareClose {
    background: none;
    border: 1px solid $color-border;
    border-radius: $radius-sm;
    color: $color-text-muted;
    cursor: pointer;
    font-family: $font-family-base;
    font-size: $fontSize-sm;
    padding: 4px 10px;

    &:hover {
        border-color: $color-accent;
        color: $color-accent;
    }
}

.lpGearRoomCompareScroll {
    flex: 1;
    overflow: auto;
}

.lpGearRoomCompareTable {
    border-collapse: collapse;
    min-width: 100%;

    th,
    td {
        border-bottom: 1px solid $color-border;
        padding: 8px 12px;
        vertical-align: middle;
        white-space: nowrap;
    }
}

.lpGearRoomCompareColAttr {
    width: 140px;
    min-width: 140px;
}

.lpGearRoomCompareColItem {
    min-width: 160px;
}

.lpGearRoomCompareAttrCell {
    background: $color-bg;
    border-right: 1px solid $color-border;
    color: $color-text-muted;
    font-size: $fontSize-sm;
    font-weight: $fontWeight-bold;
    max-width: 140px;
    min-width: 140px;
    position: sticky;
    left: 0;
    width: 140px;
}

.lpGearRoomCompareAttrHeader {
    background: $color-bg;
}

.lpGearRoomCompareItemHeader {
    align-items: center;
    background: $color-surface;
    border-bottom: 2px solid $color-border;
    display: table-cell;
    padding: 8px 12px;
    text-align: left;
}

.lpGearRoomCompareItemName {
    font-size: $fontSize-sm;
    font-weight: $fontWeight-bold;
    margin-right: 8px;
}

.lpGearRoomCompareRemove {
    background: none;
    border: none;
    color: $color-text-muted;
    cursor: pointer;
    font-size: 11px;
    padding: 2px 4px;

    &:hover {
        color: $color-accent;
    }
}

.lpGearRoomCompareValueCell {
    font-size: $fontSize-sm;
    min-width: 160px;
}

.lpGearRoomCompareNameCell {
    font-weight: $fontWeight-bold;
}

.lpGearRoomCompareDescCell {
    color: $color-text-muted;
    max-width: 240px;
    overflow: hidden;
    text-overflow: ellipsis;
}

.lpGearRoomCompareThumb {
    border-radius: $radius-sm;
    display: block;
    height: 40px;
    object-fit: cover;
    width: 40px;
}

.lpGearRoomCompareThumbPlaceholder {
    background: rgba(var(--color-accent-rgb), 0.06);
    border-radius: $radius-sm;
    height: 40px;
    width: 40px;
}

.lpGearRoomCompareMuted {
    color: $color-text-muted;
}

.lpGearRoomCompareLowest {
    background: rgba(34, 197, 94, 0.12);
    color: #16a34a;
    font-weight: $fontWeight-bold;
}
</style>

<template>
    <div :class="['lpGearRoomComparePanel', { 'lpGearRoomComparePanel--open': open }]">
        <div class="lpGearRoomCompareHeader">
            <span class="lpGearRoomCompareTitle">Compare {{ items.length }} items</span>
            <button class="lpGearRoomCompareClose" @click="$emit('close')">✕ Close</button>
        </div>
        <div class="lpGearRoomCompareScroll">
            <table class="lpGearRoomCompareTable">
                <colgroup>
                    <col class="lpGearRoomCompareColAttr">
                    <col v-for="item in items" :key="item.id" class="lpGearRoomCompareColItem">
                </colgroup>
                <thead>
                    <tr>
                        <th class="lpGearRoomCompareAttrCell lpGearRoomCompareAttrHeader"></th>
                        <th v-for="item in items" :key="item.id" class="lpGearRoomCompareItemHeader">
                            <span class="lpGearRoomCompareItemName">{{ itemDisplayName(item) }}</span>
                            <button class="lpGearRoomCompareRemove" @click="$emit('remove-item', item.id)">✕</button>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td class="lpGearRoomCompareAttrCell">Image</td>
                        <td v-for="item in items" :key="item.id" class="lpGearRoomCompareValueCell">
                            <img v-if="itemThumb(item)" :src="itemThumb(item)" class="lpGearRoomCompareThumb" :alt="item.name">
                            <div v-else class="lpGearRoomCompareThumbPlaceholder"></div>
                        </td>
                    </tr>
                    <tr>
                        <td class="lpGearRoomCompareAttrCell">Name</td>
                        <td v-for="item in items" :key="item.id" class="lpGearRoomCompareValueCell lpGearRoomCompareNameCell">
                            {{ itemDisplayName(item) }}
                        </td>
                    </tr>
                    <tr>
                        <td class="lpGearRoomCompareAttrCell">Brand</td>
                        <td v-for="item in items" :key="item.id" class="lpGearRoomCompareValueCell">
                            {{ item.brand || '—' }}
                        </td>
                    </tr>
                    <tr>
                        <td class="lpGearRoomCompareAttrCell">Description</td>
                        <td v-for="item in items" :key="item.id" class="lpGearRoomCompareValueCell lpGearRoomCompareDescCell">
                            {{ item.description || '—' }}
                        </td>
                    </tr>
                    <tr>
                        <td class="lpGearRoomCompareAttrCell">Type</td>
                        <td v-for="item in items" :key="item.id" class="lpGearRoomCompareValueCell">
                            <span v-if="item.category" class="lpGearRoomCategoryBadge">{{ item.category }}</span>
                            <span v-else class="lpGearRoomCompareMuted">—</span>
                        </td>
                    </tr>
                    <tr>
                        <td class="lpGearRoomCompareAttrCell">Tags</td>
                        <td v-for="item in items" :key="item.id" class="lpGearRoomCompareValueCell lpGearRoomCompareDescCell">
                            {{ item.tags && item.tags.length ? item.tags.join(', ') : '—' }}
                        </td>
                    </tr>
                    <tr>
                        <td class="lpGearRoomCompareAttrCell">Weight</td>
                        <td
                            v-for="item in items"
                            :key="item.id"
                            :class="['lpGearRoomCompareValueCell', { 'lpGearRoomCompareLowest': compareMinWeight !== null && item.weight === compareMinWeight }]"
                        >
                            {{ displayWeight(item.weight, item.authorUnit) }} {{ item.authorUnit }}
                        </td>
                    </tr>
                    <tr>
                        <td class="lpGearRoomCompareAttrCell">Price</td>
                        <td v-for="item in items" :key="item.id" class="lpGearRoomCompareValueCell">
                            {{ item.price > 0 ? '€' + item.price : '—' }}
                        </td>
                    </tr>
                    <tr>
                        <td class="lpGearRoomCompareAttrCell">Used in lists</td>
                        <td v-for="item in items" :key="item.id" class="lpGearRoomCompareValueCell">
                            {{ item._usedInLists }} list{{ item._usedInLists !== 1 ? 's' : '' }}
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>

<script>
import { useUtils } from '../composables/useUtils.js';

const { displayWeight } = useUtils();

export default {
    name: 'GearRoomComparePanel',
    props: {
        items: {
            type: Array,
            default: () => [],
        },
        open: {
            type: Boolean,
            default: false,
        },
    },
    emits: ['close', 'remove-item'],
    computed: {
        compareMinWeight() {
            const weights = this.items.map(i => i.weight || 0).filter(w => w > 0);
            return weights.length ? Math.min(...weights) : null;
        },
    },
    methods: {
        displayWeight,
        itemDisplayName(item) {
            return [item.brand, item.name].filter(Boolean).join(' ');
        },
        itemThumb(item) {
            if (item.image) return `https://i.imgur.com/${item.image}s.jpg`;
            if (item.imageUrl) return item.imageUrl;
            return '';
        },
    },
};
</script>
