<style lang="scss" scoped>
@import "../css/_globals";


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
        <item-detail-header
            :name="item.name || 'Unnamed item'"
            :brand="item.brand || ''"
            :category="item.category || ''"
            :image-key="item.image || ''"
            :image-url="item.imageUrl || ''"
            :starred="localStarred"
            @toggle-star="toggleStar"
            @close="$emit('close')"
            @view-image="viewImage"
            :show-add-category="true"
            @click-category="$emit('start-edit')"
        />

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
                        :class="{ active: categoryItem && localCategoryStar >= n, disabled: !categoryItem }"
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
            <button class="lpButton lpButtonSecondary itemDetailDuplicate" @click="$emit('duplicate')">
                Duplicate
            </button>
            <button class="lpButton itemDetailEdit" @click="$emit('start-edit')">
                Edit gear
            </button>
        </div>
    </div>
</template>

<script>
import ItemDetailHeader from './item-detail-header.vue';
import ItemAddToList from './item-add-to-list.vue';
import { openSpeedbump } from '../services/speedbump';
import { openDialog } from '../services/dialogs';

const weightUtils = require('../utils/weight.js');

export default {
    name: 'ItemDetailView',
    components: { ItemDetailHeader, ItemAddToList },
    props: {
        item: { type: Object, required: true },
        categoryItem: { type: Object, default: null },
        category: { type: Object, default: null },
    },
    emits: ['close', 'start-edit', 'duplicate'],
    data() {
        return {
            localStarred: false,
            localCategoryStar: 0,
        };
    },
    created() {
        this.localStarred = !!this.item?.starred;
        this.localCategoryStar = this.categoryItem?.star || 0;
    },
    watch: {
        'item.starred'(val) { this.localStarred = !!val; },
        'categoryItem.star'(val) { this.localCategoryStar = val || 0; },
    },
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
            const starred = !this.localStarred;
            this.$store.commit('updateItem', { ...this.item, starred });
            this.localStarred = starred;
        },
        setCategoryStar(n) {
            if (!this.categoryItem || !this.category) return;
            const star = this.localCategoryStar === n ? 0 : n;
            const updated = { ...this.categoryItem, star };
            this.$store.commit('updateCategoryItem', { category: this.category, categoryItem: updated });
            this.localCategoryStar = star;
        },
        viewImage() {
            openDialog('itemViewImage', this.thumbnailImage);
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
            this.$emit('close');
        },
    },
};
</script>
