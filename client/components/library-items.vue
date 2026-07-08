<style lang="scss">
@import "../css/_library-items";
</style>

<template>
    <section class="libraryContainer">
        <div v-if="showTitle" class="libraryHeader">
            <h2>{{ $t('library.itemsTitle') }}</h2>
            <button class="lpButton lpSmall lpButtonSecondary libraryCreateButton" @click="createLibraryItem">{{ $t('library.newGearButton') }}</button>
        </div>
        <div class="lpLibraryFilters">
            <div class="lpLibraryFilterSelectWrap">
                <select v-model="filterCategory" class="lpLibraryFilterSelect">
                    <option value="">{{ $t('library.allCategories') }}</option>
                    <option v-for="cat in gearCategories" :key="cat" :value="cat">{{ cat }}</option>
                </select>
            </div>
            <div class="librarySearchWrap librarySearchInline">
                <input
                    ref="searchInput"
                    class="librarySearch"
                    v-model="searchText"
                    type="text"
                    :placeholder="$t('library.searchPlaceholder')"
                >
                <button
                    v-if="searchText"
                    class="librarySearchClear"
                    type="button"
                    :aria-label="$t('library.clearSearchAria')"
                    @click="clearSearch"
                >
                    ×
                </button>
            </div>
        </div>
        <div v-if="filterTags.length || tagInputFocused" class="lpTagFilter">
            <span v-for="tag in filterTags" :key="tag" class="lpTagChip">
                {{ tag }}<button class="lpTagChipRemove" @click="removeFilterTag(tag)">×</button>
            </span>
            <input
                v-model="tagInput"
                type="text"
                class="lpTagInput"
                :placeholder="$t('library.filterByTagPlaceholder')"
                @keydown.enter.prevent="addFilterTag"
                @focus="tagInputFocused = true"
                @blur="tagInputFocused = false"
            />
        </div>
        <ul class="library" ref="library">
            <li v-for="item in filteredItems" :key="item.id" class="lpLibraryItem" :data-item-id="item.id" @dblclick="openDetail(item)">
                <a v-if="item.url" :href="item.url" target="_blank" class="lpName lpHref">{{ item.name }}</a>
                <span v-if="!item.url" class="lpName">{{ item.name }}</span>
                <span class="lpWeight">
                    {{ displayWeight(item.weight, item.authorUnit) }}
                    {{ item.authorUnit }}
                </span>
                <span class="lpDescription">
                    {{ item.description }}
                </span>
                <a class="lpRemove lpRemoveLibraryItem speedbump" :title="$t('library.deleteItemTitle')" @click="removeItem(item)"><i class="lpSprite lpSpriteRemove" /></a>
                <button class="lpLibraryItemEdit" :title="$t('library.viewItemDetailsTitle')" @click.stop="openDetail(item)">⋯</button>
                <div class="lpHandle lpLibraryItemHandle" :title="$t('library.dragToAddTitle')" />
            </li>
        </ul>
    </section>
</template>

<script>
import { useUtils } from '../composables/useUtils.js';
import { openDialog } from '../services/dialogs';
import { openSpeedbump } from '../services/speedbump';
import { getElementIndex } from '../utils/utils';
import { createDragDrop, getDatasetInt, queryContainers } from '../services/drag-drop';

const { displayWeight, displayPrice } = useUtils();

const GEAR_CATEGORIES = [
    'Pack & Bags', 'Shelter', 'Sleep', 'Clothing', 'Water', 'Food', 'Cook',
    'Navigation', 'Safety', 'Hygiene', 'Electronics', 'Essentials', 'Other',
];

export default {
    name: 'LibraryItem',
    props: {
        item: {
            type: Object,
            required: false,
            default: null,
        },
        showTitle: {
            type: Boolean,
            default: true,
        },
    },
    data() {
        return {
            searchText: '',
            filterCategory: '',
            filterTags: [],
            tagInput: '',
            tagInputFocused: false,
            itemDragId: false,
            drake: null,
        };
    },
    computed: {
        library() {
            return this.$store.state.library;
        },
        gearCategories() {
            return GEAR_CATEGORIES;
        },
        filteredItems() {
            if (!this.library || !this.library.items) return [];
            let i;
            let item;
            let filteredItems = [];
            if (!this.searchText) {
                filteredItems = this.library.items.map(item => ({ ...item }));
            } else {
                const lowerCaseSearchText = this.searchText.toLowerCase();

                for (i = 0; i < this.library.items.length; i++) {
                    item = this.library.items[i];
                    if (item.name.toLowerCase().indexOf(lowerCaseSearchText) > -1 || item.description.toLowerCase().indexOf(lowerCaseSearchText) > -1) {
                        filteredItems.push({ ...item });
                    }
                }
            }

            if (this.filterCategory) {
                filteredItems = filteredItems.filter(item =>
                    (item.category || '').toLowerCase() === this.filterCategory.toLowerCase()
                );
            }
            if (this.filterTags.length) {
                filteredItems = filteredItems.filter(item =>
                    this.filterTags.every(tag =>
                        (item.tags || []).map(t => t.toLowerCase()).includes(tag.toLowerCase())
                    )
                );
            }

            const currentListItems = this.library.getItemsInCurrentList();

            for (i = 0; i < filteredItems.length; i++) {
                item = filteredItems[i];
                if (currentListItems.indexOf(item.id) > -1) {
                    item.inCurrentList = true;
                }
            }

            return filteredItems;
        },
        list() {
            if (!this.library || typeof this.library.getListById !== 'function') return null;
            return this.library.getListById(this.library.defaultListId);
        },
        categories() {
            if (!this.list) return [];
            return this.list.categoryIds.map(id => this.library.getCategoryById(id));
        },
    },
    watch: {
        categories() {
            this.$nextTick(() => {
                this.handleItemDrag();
            });
        },
        filteredItems() {
            this.$nextTick(() => {
                this.handleItemDrag();
            });
        },
    },
    mounted() {
        this.handleItemDrag();
    },
    beforeUnmount() {
        if (this.drake) {
            this.drake.destroy();
            this.drake = null;
        }
    },
    methods: {
        displayWeight,
        displayPrice,
        openDetail(item, startEditing = false) {
            openDialog('itemDetail', { item, categoryItem: null, category: null, startEditing });
        },
        addFilterTag() {
            const tag = this.tagInput.trim().toLowerCase();
            if (tag && !this.filterTags.includes(tag)) {
                this.filterTags.push(tag);
            }
            this.tagInput = '';
        },
        removeFilterTag(tag) {
            this.filterTags = this.filterTags.filter(t => t !== tag);
        },
        clearSearch() {
            this.searchText = '';
            this.$nextTick(() => {
                if (this.$refs.searchInput) {
                    this.$refs.searchInput.focus();
                }
            });
        },
        createLibraryItem() {
            this.$store.commit('newItem', {
                _isNew: true,
                name: this.searchText.trim(),
            });

            const newItem = this.$store.state.library.items[this.$store.state.library.items.length - 1];
            openDialog('itemDetail', { item: newItem, categoryItem: null, category: null });
        },
        handleItemDrag() {
            if (this.drake) {
                this.drake.destroy();
            }

            const self = this;
            const editorRoot = this.$root && this.$root.$el ? this.$root.$el : this.$el;
            const categoryItems = queryContainers(editorRoot, '.lpItems');
            const drake = createDragDrop([this.$refs.library].concat(categoryItems), {
                copy: true,
                moves($el, $source, $handle, $sibling) {
                    return $handle.classList.contains('lpLibraryItemHandle');
                },
                accepts($el, $target, $source, $sibling) {
                    if ($target.classList.contains('library') || !$sibling || $sibling.classList.contains('lpItemsHeader')) {
                        return false; // header and footer are technically part of this list - exclude them both.
                    }
                    return true;
                },
            });
            drake.on('drag', ($el, $target, $source, $sibling) => {
                this.itemDragId = getDatasetInt($el, 'itemId');
            });
            drake.on('drop', ($el, $target, $source, $sibling) => {
                if (!$target || $target.classList.contains('library')) {
                    return;
                }
                const categoryId = getDatasetInt($target, 'categoryId');
                if (this.itemDragId === null || categoryId === null) {
                    drake.cancel(true);
                    return;
                }
                this.$store.commit('addItemToCategory', { itemId: this.itemDragId, categoryId, dropIndex: getElementIndex($el) - 1 });
                drake.cancel(true);
            });
            this.drake = drake;
        },
        removeItem(item) {
            const callback = () => {
                this.$store.commit('removeItem', item);
            };
            const speedbumpOptions = {
                body: this.$t('library.deleteItemConfirm'),
            };
            openSpeedbump(callback, speedbumpOptions);
        },
    },
};
</script>
