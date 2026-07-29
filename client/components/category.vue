<style lang="scss">
@import "../css/_globals";

.lpQtySubtotal {
    padding-right: 25px;
}

.lpPriceSubtotal {
    padding-right: 4px;
}

.lpAddItemInput {
    border-radius: $radius-sm;
    border: none;
    border-bottom: 1px solid $color-border;
    background: transparent;
    color: $color-text;
    font-size: $fontSize-base;
    min-height: 42px;
    padding: 8px 10px;
    width: 100%;
    max-width: 260px;
    &:focus { outline: none; border-bottom-color: $color-accent; }
}

.lpAddItemCell {
    align-self: stretch;
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-height: 56px;
    overflow: visible;
    position: relative;
}

.lpAddItemActions {
    align-items: flex-start;
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-left: 20px;

    .lpAddItem {
        margin-left: 0;
    }
}

.lpAddItemWithDetails {
    align-items: center;
    display: inline-flex;
    font-size: $fontSize-xs;
    min-height: 24px;
    opacity: 0.72;

    &:hover,
    &:focus-visible {
        opacity: 1;
    }
}

.lpSuggestions {
    background: $color-surface;
    border: 1px solid $color-border;
    border-radius: $radius-sm;
    box-shadow: 0 4px 12px rgba(0,0,0,0.10);
    left: 0;
    list-style: none;
    margin: 0;
    padding: 4px 0;
    position: absolute;
    top: calc(100% + 6px);
    width: 260px;
    z-index: 50;
}

.lpSuggestion {
    align-items: center;
    cursor: pointer;
    display: flex;
    gap: 8px;
    padding: 6px 10px;
    &:hover { background: rgba(var(--color-accent-rgb), 0.07); }
}

.lpSuggestionName { flex: 1; font-size: $fontSize-sm; }
.lpSuggestionBrand { color: $color-text-muted; font-size: $fontSize-sm; }
.lpSuggestionWeight { color: $color-text-muted; font-size: $fontSize-sm; white-space: nowrap; }
</style>

<template>
    <li :id="category.id" class="lpCategory" :data-category-id="category.id">
        <ul class="lpItems lpDataTable" :data-category-id="category.id">
            <li class="lpHeader lpItemsHeader">
                <span class="lpHandleCell">
                    <div v-if="!isPackingMode" class="lpHandle lpCategoryHandle" :title="$t('misc.reorderCategory')" />
                </span>
                <input v-focus-on-create="category._isNew" type="text" :value="category.name" :placeholder="$t('misc.categoryName')" class="lpCategoryName lpSilent" :disabled="isPackingMode" @input="updateCategoryName">
                <span v-if="library.optionalFields['price']" class="lpPriceCell">{{ $t('public.price') }}</span>
                <span class="lpWeightCell">{{ $t('public.weight') }}</span>
                <span class="lpQtyCell">{{ $t('public.qty') }}</span>
                <span class="lpRemoveCell"><a v-if="!isPackingMode" class="lpRemove lpRemoveCategory" role="button" tabindex="0" :title="$t('misc.deleteCategory')" @click="removeCategory(category)" @keydown.enter="removeCategory(category)" @keydown.space.prevent="removeCategory(category)"><i class="lpSprite lpSpriteRemove" /></a></span>
            </li>
            <item
                v-for="itemContainer in itemContainers"
                :key="itemContainer.item.id"
                :item-container="itemContainer"
                :category="category"
                :is-packing-mode="isPackingMode"
                :packed-item-ids="packedItemIds"
                @toggle-pack="$emit('toggle-pack', $event)"
            />
            <li class="lpFooter lpItemsFooter">
                <span v-if="!isPackingMode" class="lpAddItemCell">
                    <input
                        v-if="showSuggestions || newItemName || showInput"
                        v-model="newItemName"
                        type="text"
                        class="lpSilent lpAddItemInput"
                        :placeholder="$t('misc.itemNamePlaceholder')"
                        aria-keyshortcuts="Meta+Enter Control+Enter"
                        @input="onNewItemInput"
                        @keydown.enter.exact.prevent="createInlineItem('description')"
                        @keydown.meta.enter.prevent="createAndOpenEditor"
                        @keydown.ctrl.enter.prevent="createAndOpenEditor"
                        @keydown.tab.exact.prevent="createInlineItem('description')"
                        @keydown.escape="dismissSuggestions"
                        @blur="dismissSuggestions"
                    />
                    <span v-else class="lpAddItemActions">
                        <a class="lpAdd lpAddItem" @click="showAddInput"><i class="lpSprite lpSpriteAdd" />{{ $t('misc.addItem') }}</a>
                        <a class="lpAdd lpAddItemWithDetails" @click="createAndOpenEditor">{{ $t('misc.addItemWithDetails') }}</a>
                    </span>
                    <ul v-if="showSuggestions" class="lpSuggestions">
                        <li
                            v-for="item in suggestions"
                            :key="item.id"
                            class="lpSuggestion"
                            @mousedown.prevent="selectSuggestion(item)"
                        >
                            <span class="lpSuggestionName">{{ item.name }}</span>
                            <span v-if="item.brand" class="lpSuggestionBrand">{{ item.brand }}</span>
                            <span class="lpSuggestionWeight">{{ displayWeight(item.weight, library.itemUnit) }} {{ library.itemUnit }}</span>
                        </li>
                    </ul>
                </span>
                <span v-if="library.optionalFields['price']" class="lpPriceCell lpNumber lpSubtotal">
                    {{ displayPrice(category.subtotalPrice, library.currencySymbol) }}
                </span>
                <span class="lpWeightCell lpNumber lpSubtotal">
                    <span class="lpDisplaySubtotal">{{ displayWeight(category.subtotalWeight, displayUnit) }}</span>
                    <span class="lpSubtotalUnit">{{ displayUnit }}</span>
                </span>
                <span class="lpQtyCell lpSubtotal">
                    <span class="lpQtySubtotal">{{ +category.subtotalQty.toFixed(2) }}</span>
                </span>
                <span class="lpRemoveCell" />
            </li>
        </ul>
    </li>
</template>

<script>
import item from './item.vue';
import { openDialog } from '../services/dialogs';
import { openSpeedbump } from '../services/speedbump';
import { useUtils } from '../composables/useUtils.js';
import { suggestItems } from '../composables/useGearMatcher.js';

const { displayWeight, displayPrice } = useUtils();

export default {
    name: 'Category',
    components: {
        item,
    },
    props: ['category', 'isPackingMode', 'packedItemIds'],
    data() {
        return {
            newItemName: '',
            suggestions: [],
            showSuggestions: false,
            showInput: false,
        };
    },
    computed: {
        library() {
            return this.$store.state.library;
        },
        itemContainers() {
            void this.$store.state.itemVersion;
            void this.$store.state.categoryItemVersion;
            return this.category.categoryItems
                .map(categoryItem => ({ categoryItem, item: this.library.getItemById(categoryItem.itemId) }))
                .filter(itemContainer => itemContainer.item);
        },
        displayUnit() {
            if (this.library.totalUnit !== 'oz') {
                return this.library.totalUnit;
            }

            const units = {};
            this.itemContainers.forEach(({ item }) => {
                if (item && item.authorUnit) {
                    units[item.authorUnit] = true;
                }
            });

            const unitList = Object.keys(units);
            return unitList.length === 1 ? unitList[0] : this.library.totalUnit;
        },
    },
    methods: {
        displayWeight,
        displayPrice,
        createInlineItem(focusField = 'name') {
            const name = this.newItemName.trim();

            if (!name) {
                this.dismissSuggestions();
                return;
            }

            this.$store.commit('newItem', {
                category: this.category,
                _isNew: true,
                name,
            });

            const newItem = this.$store.state.library.items[this.$store.state.library.items.length - 1];

            this.newItemName = '';
            this.suggestions = [];
            this.showSuggestions = false;
            this.showInput = false;

            this.$nextTick(() => {
                const selector = focusField === 'description' ? '.lpDescription' : '.lpName';
                const field = this.$el.querySelector(`[data-item-id="${newItem.id}"] ${selector}`);
                if (field) {
                    field.focus();
                }
            });
        },
        createAndOpenEditor() {
            const name = this.newItemName.trim();

            this.$store.commit('newItem', {
                category: this.category,
                _isNew: true,
                name,
            });

            const items = this.$store.state.library.items;
            const newItem = items[items.length - 1];
            const categoryItem = this.category.getCategoryItemById(newItem.id);

            this.newItemName = '';
            this.suggestions = [];
            this.showSuggestions = false;
            this.showInput = false;

            openDialog('itemDetail', {
                item: newItem,
                categoryItem,
                category: this.category,
                startEditing: true,
                discardOnCancel: true,
                initialFocus: name ? 'description' : 'name',
            });
        },
        onNewItemInput(evt) {
            this.suggestions = suggestItems(
                this.newItemName,
                this.library.items,
                this.category.name,
            );
            this.showSuggestions = this.suggestions.length > 0;
        },
        selectSuggestion(item) {
            this.$store.commit('addItemToCategory', { itemId: item.id, categoryId: this.category.id, dropIndex: this.category.categoryItems.length });
            this.newItemName = '';
            this.suggestions = [];
            this.showSuggestions = false;
            this.showInput = false;
        },
        dismissSuggestions() {
            setTimeout(() => {
                this.showSuggestions = false;
                this.newItemName = '';
                this.showInput = false;
            }, 150);
        },
        showAddInput() {
            this.showSuggestions = false;
            this.newItemName = '';
            this.showInput = true;
            this.$nextTick(() => {
                const input = this.$el.querySelector('.lpAddItemInput');
                if (input) input.focus();
            });
        },
        updateCategoryName(evt) {
            this.$store.commit('updateCategoryName', { id: this.category.id, name: evt.target.value });
        },
        removeCategory(category) {
            const callback = () => {
                this.$store.commit('removeCategory', category);
            };
            const speedbumpOptions = {
                body: this.$t('misc.deleteCategory'),
            };
            openSpeedbump(callback, speedbumpOptions);
        },
    },
};
</script>
