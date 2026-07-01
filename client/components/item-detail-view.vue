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

.itemDetailStats {
    border-bottom: 1px solid $color-border;
    display: grid;
    grid-template-columns: repeat(4, 1fr);

    .itemDetailStat {
        border-right: 1px solid $color-border;
        padding: 12px 8px;
        text-align: center;

        &:last-child {
            border-right: none;
        }

        .itemDetailStatLabel {
            color: $color-text-muted;
            font-size: $fontSize-sm;
            font-weight: $fontWeight-medium;
            letter-spacing: $letterSpacing-caps;
            margin-bottom: 4px;
            text-transform: uppercase;
        }

        .itemDetailStatValue {
            font-size: 18px;
            font-weight: $fontWeight-bold;
        }
    }
}

.itemDetailStarRow {
    display: flex;
    gap: 4px;
    justify-content: center;
}

.itemDetailStarBtn {
    color: $color-border;
    cursor: pointer;
    font-size: 16px;
    transition: color $transitionDurationFast ease;

    &:hover,
    &.active {
        color: #f59e0b;
    }

    &.disabled {
        cursor: default;
        pointer-events: none;
    }
}

.itemDetailBody {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 20px;
}

.itemDetailSection {
    .itemDetailSectionLabel {
        color: $color-text-muted;
        font-size: $fontSize-sm;
        font-weight: $fontWeight-medium;
        letter-spacing: $letterSpacing-caps;
        margin-bottom: 6px;
        text-transform: uppercase;
    }

    .itemDetailSectionValue {
        color: $color-text;
        font-size: $fontSize-base;

        &.muted {
            color: $color-text-muted;
            font-style: italic;
        }
    }

    a.itemDetailLink {
        align-items: center;
        color: $color-accent;
        display: inline-flex;
        font-size: $fontSize-base;
        gap: 6px;
        text-decoration: none;

        &:hover {
            text-decoration: underline;
        }
    }

    .itemDetailTags {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;

        .itemDetailTag {
            background: $color-surface;
            border: 1px solid $color-border;
            border-radius: 99px;
            font-size: $fontSize-sm;
            padding: 2px 10px;
        }
    }
}

.itemDetailUsedInLists {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
}

.itemDetailUsedInBadge {
    background: rgba(var(--color-accent-rgb), 0.08);
    border: 1px solid rgba(var(--color-accent-rgb), 0.18);
    border-radius: 999px;
    color: $color-text-muted;
    font-size: $fontSize-sm;
    font-family: $font-family-base;
    padding: 2px 10px;
    cursor: pointer;

    &:hover {
        background: rgba(var(--color-accent-rgb), 0.16);
        border-color: rgba(var(--color-accent-rgb), 0.4);
        color: $color-accent;
    }
}

.itemDetailDivider {
    border: none;
    border-top: 1px solid $color-border;
    margin: 0;
}

.itemDetailFooter {
    align-items: center;
    border-top: 1px solid $color-border;
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    padding: 14px 20px;

    .itemDetailRemove {
        align-items: center;
        background: rgba(var(--color-accent-rgb), 0.05);
        border: 1px solid rgba(var(--color-accent-rgb), 0.12);
        border-radius: $radius-md;
        color: $color-text-muted;
        cursor: pointer;
        display: inline-flex;
        font-size: $fontSize-sm;
        font-weight: $fontWeight-medium;
        min-height: 44px;
        padding: 0 14px;
        text-decoration: none;
        transition: background-color $transitionDurationFast ease, border-color $transitionDurationFast ease, color $transitionDurationFast ease;

        &:hover {
            background: rgba(var(--color-accent-rgb), 0.09);
            border-color: rgba(var(--color-accent-rgb), 0.18);
            color: $color-text;
        }
    }

    .itemDetailDelete {
        align-items: center;
        background: rgba(var(--color-danger-rgb), 0.06);
        border: 1px solid rgba(var(--color-danger-rgb), 0.16);
        border-radius: $radius-md;
        color: $color-danger;
        cursor: pointer;
        display: flex;
        font-size: $fontSize-sm;
        font-weight: $fontWeight-medium;
        min-height: $control-height-lg;
        padding: 0 14px;
        text-decoration: none;
        transition: background-color $transitionDurationFast ease, border-color $transitionDurationFast ease, color $transitionDurationFast ease;

        &:hover {
            background: rgba(var(--color-danger-rgb), 0.1);
            border-color: rgba(var(--color-danger-rgb), 0.22);
            color: $color-danger-hover;
        }
    }

    .itemDetailSpacer {
        flex: 1;
    }

    .lpButton.itemDetailEdit {
        align-items: center;
        display: flex;
        min-height: 44px;
        padding: 0 22px;
    }
}
</style>

<template>
    <div class="itemDetailView">
        <div class="itemDetailHeader">
            <img v-if="thumbnailImage" class="itemDetailThumb" :src="thumbnailImage" @click="viewImage">
            <div v-else class="itemDetailThumbPlaceholder" aria-label="No item image">
                <zenpak-gear-icon />
            </div>
            <div class="itemDetailHeaderInfo">
                <div class="itemDetailName">{{ item.name || 'Unnamed item' }}</div>
                <div v-if="item.brand" class="itemDetailBrand">{{ item.brand }}</div>
                <span v-if="item.category" class="itemDetailCategoryBadge">{{ item.category }}</span>
            </div>
            <button class="itemDetailStar" :class="{ active: item.starred }" :title="item.starred ? 'Remove from favorites' : 'Add to favorites'" @click="toggleStar">
                {{ item.starred ? '★' : '☆' }}
            </button>
            <button class="lpIconButton itemDetailClose" title="Close" @click="$emit('close')">×</button>
        </div>

        <div class="itemDetailStats">
            <div class="itemDetailStat">
                <div class="itemDetailStatLabel">Weight</div>
                <div class="itemDetailStatValue">{{ displayWeight }} {{ item.authorUnit }}</div>
            </div>
            <div class="itemDetailStat">
                <div class="itemDetailStatLabel">Price</div>
                <div class="itemDetailStatValue">{{ item.price ? item.price.toFixed(2) : '—' }}</div>
            </div>
            <div class="itemDetailStat">
                <div class="itemDetailStatLabel">Qty</div>
                <div class="itemDetailStatValue">{{ categoryItem ? categoryItem.qty : 1 }}</div>
            </div>
            <div class="itemDetailStat">
                <div class="itemDetailStatLabel">Rating</div>
                <div class="itemDetailStatValue itemDetailStarRow">
                    <span
                        v-for="n in 3"
                        :key="n"
                        class="itemDetailStarBtn"
                        :class="{ active: categoryItem && categoryItem.star >= n, disabled: !categoryItem }"
                        @click="setCategoryStar(n)"
                    >★</span>
                </div>
            </div>
        </div>

        <div class="itemDetailBody">
            <div class="itemDetailSection">
                <div class="itemDetailSectionLabel">Description</div>
                <div :class="['itemDetailSectionValue', { muted: !item.description }]">
                    {{ item.description || 'No description added' }}
                </div>
            </div>

            <hr v-if="item.url" class="itemDetailDivider">

            <div v-if="item.url" class="itemDetailSection">
                <div class="itemDetailSectionLabel">Purchase Link</div>
                <a :href="item.url" target="_blank" rel="noopener" class="itemDetailLink">
                    ↗ View product page
                </a>
            </div>

            <hr v-if="item.tags && item.tags.length" class="itemDetailDivider">

            <div v-if="item.tags && item.tags.length" class="itemDetailSection">
                <div class="itemDetailSectionLabel">Tags</div>
                <div class="itemDetailTags">
                    <span v-for="tag in item.tags" :key="tag" class="itemDetailTag">{{ tag }}</span>
                </div>
            </div>

            <hr v-if="itemUsedInLists.length" class="itemDetailDivider">

            <div v-if="itemUsedInLists.length" class="itemDetailSection">
                <div class="itemDetailSectionLabel">Used in</div>
                <div class="itemDetailUsedInLists">
                    <button
                        v-for="list in itemUsedInLists"
                        :key="list.id"
                        class="itemDetailUsedInBadge"
                        @click="navigateToList(list)"
                    >
                        {{ list.name || 'Unnamed list' }}
                    </button>
                </div>
            </div>
        </div>

        <div class="itemDetailFooter">
            <a v-if="category" class="itemDetailRemove" @click="removeFromList">
                Remove from list
            </a>
            <item-add-to-list v-else :item="item" @added="$emit('close')" />
            <a class="itemDetailDelete" @click="deleteGear">
                Delete gear
            </a>
            <div class="itemDetailSpacer" />
            <button class="lpButton itemDetailEdit" @click="$emit('start-edit')">
                Edit gear
            </button>
        </div>
    </div>
</template>

<script>
import ZenpakGearIcon from './zenpak-gear-icon.vue';
import ItemAddToList from './item-add-to-list.vue';
import { openSpeedbump } from '../services/speedbump';
import { openDialog } from '../services/dialogs';

const weightUtils = require('../utils/weight.js');

export default {
    name: 'ItemDetailView',
    components: { ZenpakGearIcon, ItemAddToList },
    props: {
        item: { type: Object, required: true },
        categoryItem: { type: Object, default: null },
        category: { type: Object, default: null },
    },
    emits: ['close', 'start-edit', 'navigate-to-list'],
    computed: {
        thumbnailImage() {
            if (!this.item) return null;
            if (this.item.image) return `https://i.imgur.com/${this.item.image}l.jpg`;
            return this.item.imageUrl || null;
        },
        displayWeight() {
            if (!this.item) return 0;
            return weightUtils.MgToWeight(this.item.weight, this.item.authorUnit);
        },
        itemUsedInLists() {
            const library = this.$store.state.library;
            if (!library || !this.item) return [];
            return library.lists.filter(list =>
                list.categoryIds.some(catId => {
                    const cat = library.getCategoryById(catId);
                    return cat && cat.categoryItems.some(ci => ci.itemId === this.item.id);
                })
            );
        },
    },
    methods: {
        toggleStar() {
            const starred = !this.item.starred;
            this.$store.commit('updateItem', { ...this.item, starred });
        },
        setCategoryStar(n) {
            if (!this.categoryItem || !this.category) return;
            const star = this.categoryItem.star === n ? 0 : n;
            const updated = { ...this.categoryItem, star };
            this.$store.commit('updateCategoryItem', { category: this.category, categoryItem: updated });
        },
        viewImage() {
            openDialog('itemViewImage', { imageUrl: this.thumbnailImage });
        },
        removeFromList() {
            this.$store.commit('removeItemFromCategory', {
                itemId: this.item.id,
                category: this.category,
            });
            this.$emit('close');
        },
        deleteGear() {
            const callback = () => {
                this.$store.commit('removeItem', this.item);
                this.$emit('close');
            };
            openSpeedbump(callback, {
                body: `Delete "${this.item.name || 'this item'}" from your item library? It will be removed from all lists.`,
            });
        },
        navigateToList(list) {
            this.$store.commit('setDefaultList', list);
            this.$store.commit('setGearRoomOpen', false);
            this.$emit('navigate-to-list', list);
            this.$emit('close');
        },
    },
};
</script>
