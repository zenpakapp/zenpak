<style lang="scss" scoped>
@import "../css/_globals";

.itemDetailHeader {
    align-items: center;
    background:
        linear-gradient(180deg, rgba(var(--color-accent-rgb), 0.12), rgba(var(--color-accent-rgb), 0.02)),
        $color-surface;
    border-bottom: 1px solid rgba(var(--color-accent-rgb), 0.14);
    border-radius: $radius-md $radius-md 0 0;
    color: $color-text;
    display: flex;
    gap: 18px;
    min-height: 132px;
    padding: 22px 24px;
    position: relative;

    .itemDetailThumb {
        background: rgba(var(--color-accent-rgb), 0.08);
        border: 1px solid rgba(var(--color-accent-rgb), 0.16);
        border-radius: 16px;
        cursor: pointer;
        flex-shrink: 0;
        height: 84px;
        object-fit: cover;
        width: 84px;
    }

    .itemDetailThumbPlaceholder {
        align-items: center;
        background: rgba(var(--color-accent-rgb), 0.14);
        border: 1px solid rgba(var(--color-accent-rgb), 0.18);
        border-radius: 16px;
        color: $color-accent;
        display: flex;
        flex-shrink: 0;
        height: 84px;
        justify-content: center;
        width: 84px;

        .zenpakGearIcon {
            display: block;
            height: 46px;
            width: 52px;
        }
    }

    .itemDetailHeaderInfo {
        flex: 1;
        min-width: 0;
    }

    .itemDetailName {
        font-size: 26px;
        font-weight: $fontWeight-bold;
        line-height: 1.08;
        margin: 0 0 10px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .itemDetailBrand {
        color: $color-text-muted;
        font-size: $fontSize-base;
        margin-bottom: 8px;
    }

    .itemDetailCategoryBadge {
        background: rgba(var(--color-accent-rgb), 0.14);
        border-radius: 99px;
        color: $color-accent;
        display: inline-block;
        font-size: $fontSize-base;
        font-weight: $fontWeight-bold;
        line-height: 1;
        padding: 10px 14px;
    }

    .itemDetailAddCategoryInline {
        background: none;
        border: none;
        color: $color-accent;
        cursor: pointer;
        font-size: $fontSize-sm;
        opacity: 0.6;
        padding: 0;

        &:hover { opacity: 1; }
    }

    .itemDetailCategoryBadgeClickable {
        cursor: pointer;
        transition: background $transitionDurationFast ease;

        &:hover {
            background: rgba(var(--color-accent-rgb), 0.24);
        }
    }

    .itemDetailStar {
        background: none;
        border: none;
        color: $color-text-muted;
        cursor: pointer;
        font-size: 20px;
        line-height: 1;
        padding: 4px 6px;
        transition: color $transitionDurationFast ease, transform $transitionDurationFast ease;

        &:hover {
            color: #f59e0b;
            transform: scale(1.15);
        }

        &.active {
            color: #f59e0b;
        }
    }

    .itemDetailClose {
        align-items: center;
        background: rgba(var(--color-accent-rgb), 0.12);
        border: none;
        border-radius: 50%;
        color: $color-accent;
        cursor: pointer;
        display: flex;
        flex-shrink: 0;
        font-size: 22px;
        font-weight: $fontWeight-bold;
        height: 44px;
        justify-content: center;
        line-height: 1;
        margin-left: auto;
        width: 44px;

        &:hover {
            background: rgba(var(--color-accent-rgb), 0.2);
        }
    }
}
</style>

<template>
    <div class="itemDetailHeader">
        <img v-if="thumbnailImage" class="itemDetailThumb" :src="thumbnailImage" @click="onThumbClick">
        <div v-else class="itemDetailThumbPlaceholder" aria-label="No item image">
            <zenpak-gear-icon />
        </div>
        <div class="itemDetailHeaderInfo">
            <div class="itemDetailName">{{ name || 'Unnamed item' }}</div>
            <div v-if="brand" class="itemDetailBrand">{{ brand }}</div>
            <span v-if="category" class="itemDetailCategoryBadge itemDetailCategoryBadgeClickable" @click="$emit('click-category')">{{ category }}</span>
            <button v-else-if="showAddCategory" class="itemDetailAddCategoryInline" @click="$emit('click-category')">+ Add type</button>
        </div>
        <button class="itemDetailStar" :class="{ active: starred }" :title="starred ? $t('item.removeFromFavorites') : $t('item.addToFavorites')" @click="$emit('toggle-star')">
            {{ starred ? '★' : '☆' }}
        </button>
        <button class="lpIconButton itemDetailClose" title="Close" @click="$emit('close')">×</button>
    </div>
</template>

<script>
import ZenpakGearIcon from './zenpak-gear-icon.vue';

export default {
    name: 'ItemDetailHeader',
    components: { ZenpakGearIcon },
    props: {
        name:     { type: String, default: '' },
        brand:    { type: String, default: '' },
        category: { type: String, default: '' },
        imageKey: { type: String, default: '' },
        imageUrl: { type: String, default: '' },
        starred:  { type: Boolean, default: false },
        showAddCategory: { type: Boolean, default: false },
    },
    emits: ['toggle-star', 'close', 'view-image', 'click-category'],
    computed: {
        thumbnailImage() {
            if (this.imageKey) return `https://i.imgur.com/${this.imageKey}l.jpg`;
            return this.imageUrl || null;
        },
    },
    methods: {
        onThumbClick() { this.$emit('view-image'); },
    },
};
</script>
