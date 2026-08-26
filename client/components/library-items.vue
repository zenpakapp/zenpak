<template>
    <section class="libraryContainer">
        <div v-if="showTitle" class="libraryHeader">
            <h2>{{ $t('library.itemsTitle') }}</h2>
            <button class="lpButton lpSmall lpButtonSecondary libraryCreateButton" @click="createLibraryItem">
                {{ $t('library.newGearButton') }}
            </button>
        </div>
        <div class="lpLibraryFilters">
            <div class="lpLibraryFilterSelectWrap">
                <select v-model="filterCategory" class="lpLibraryFilterSelect">
                    <option value="">
                        {{ $t('library.allCategories') }}
                    </option>
                    <option v-for="cat in gearCategories" :key="cat" :value="cat">
                        {{ cat }}
                    </option>
                </select>
            </div>
            <div class="librarySearchWrap librarySearchInline">
                <input
                    ref="searchInput"
                    v-model="searchText"
                    class="librarySearch"
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
            >
        </div>
        <ul
            ref="library"
            class="library"
            tabindex="0"
            :aria-label="$t('library.itemsTitle')"
            @scroll.passive="handleScroll"
        >
            <li v-if="virtualWindow.top" class="lpLibrarySpacer" :style="{ height: `${virtualWindow.top}px` }" aria-hidden="true" />
            <li
                v-for="(libraryItem, index) in virtualWindow.items"
                :key="libraryItem.id"
                class="lpLibraryItem"
                :data-item-id="libraryItem.id"
                :aria-setsize="filteredItems.length"
                :aria-posinset="virtualWindow.start + index + 1"
                @dblclick="openDetail(libraryItem)"
            >
                <a v-if="libraryItem.url" :href="libraryItem.url" target="_blank" class="lpName lpHref">{{ libraryItem.name }}</a>
                <span v-if="!libraryItem.url" class="lpName">{{ libraryItem.name }}</span>
                <span class="lpWeight">
                    {{ displayWeight(libraryItem.weight, itemUnit) }}
                    {{ itemUnit }}
                </span>
                <span class="lpLibraryItemMeta">
                    {{ libraryItem.brand || libraryItem.description }}
                </span>
                <a class="lpRemove lpRemoveLibraryItem speedbump" :title="$t('library.deleteItemTitle')" @click="removeItem(libraryItem)"><i class="lpSprite lpSpriteRemove" /></a>
                <button class="lpLibraryItemEdit" :title="$t('library.viewItemDetailsTitle')" @click.stop="openDetail(libraryItem)">
                    ⋯
                </button>
                <div class="lpHandle lpLibraryItemHandle" :title="$t('library.dragToAddTitle')" />
            </li>
            <li v-if="virtualWindow.bottom" class="lpLibrarySpacer" :style="{ height: `${virtualWindow.bottom}px` }" aria-hidden="true" />
        </ul>
    </section>
</template>

<script>
import { useUtils } from '../composables/useUtils';
import { openDialog } from '../services/dialogs';
import { openSpeedbump } from '../services/speedbump';
import { getElementIndex } from '../utils/utils';
import { createDragDrop, getDatasetInt, queryContainers } from '../services/drag-drop';
import { filterLibraryItems, calculateVirtualWindow } from '../services/library-items-view';
import { GEAR_CATEGORIES } from '../data/gear-categories';

const { displayWeight } = useUtils();

const LIBRARY_ROW_HEIGHT = 52;
const LIBRARY_OVERSCAN = 6;

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
            scrollTop: 0,
            viewportHeight: 600,
            resizeObserver: null,
            scrollFrame: null,
        };
    },
    computed: {
        library() {
            return this.$store.state.library;
        },
        itemUnit() {
            return (this.library && this.library.itemUnit) || 'g';
        },
        gearCategories() {
            return GEAR_CATEGORIES;
        },
        filteredItems() {
            if (!this.library || !this.library.items) return [];
            return filterLibraryItems(this.library.items, {
                searchText: this.searchText,
                category: this.filterCategory,
                tags: this.filterTags,
            }, this.library.getItemsInCurrentList());
        },
        virtualWindow() {
            return calculateVirtualWindow({
                items: this.filteredItems,
                rowHeight: LIBRARY_ROW_HEIGHT,
                viewportHeight: this.viewportHeight,
                scrollTop: this.scrollTop,
                overscan: LIBRARY_OVERSCAN,
            });
        },
        list() {
            if (!this.library || typeof this.library.getListById !== 'function') return null;
            return this.library.getListById(this.library.defaultListId);
        },
        categories() {
            if (!this.list) return [];
            return this.list.categoryIds.map((id) => this.library.getCategoryById(id));
        },
    },
    watch: {
        searchText() {
            this.resetVirtualScroll();
        },
        filterCategory() {
            this.resetVirtualScroll();
        },
        filterTags: {
            deep: true,
            handler() {
                this.resetVirtualScroll();
            },
        },
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
        this.measureViewport();
        if (typeof ResizeObserver !== 'undefined') {
            this.resizeObserver = new ResizeObserver(() => this.measureViewport());
            this.resizeObserver.observe(this.$refs.library);
        }
        this.handleItemDrag();
    },
    beforeUnmount() {
        if (this.resizeObserver) this.resizeObserver.disconnect();
        if (this.scrollFrame) cancelAnimationFrame(this.scrollFrame);
        if (this.drake) {
            this.drake.destroy();
            this.drake = null;
        }
    },
    methods: {
        displayWeight,
        measureViewport() {
            if (this.$refs.library) {
                this.viewportHeight = this.$refs.library.clientHeight;
            }
        },
        resetVirtualScroll() {
            this.scrollTop = 0;
            if (this.$refs.library) this.$refs.library.scrollTop = 0;
        },
        handleScroll(event) {
            if (this.scrollFrame) return;
            const scrollElement = event.currentTarget;
            this.scrollFrame = requestAnimationFrame(() => {
                this.scrollTop = scrollElement.scrollTop;
                this.scrollFrame = null;
            });
        },
        openDetail(item, startEditing = false) {
            openDialog('itemDetail', {
                item, categoryItem: null, category: null, startEditing,
            });
        },
        addFilterTag() {
            const tag = this.tagInput.trim().toLowerCase();
            if (tag && !this.filterTags.includes(tag)) {
                this.filterTags.push(tag);
            }
            this.tagInput = '';
        },
        removeFilterTag(tag) {
            this.filterTags = this.filterTags.filter((t) => t !== tag);
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
        async handleItemDrag() {
            if (this.drake) {
                this.drake.destroy();
            }

            const editorRoot = this.$root && this.$root.$el ? this.$root.$el : this.$el;
            const categoryItems = queryContainers(editorRoot, '.lpItems');
            const drake = await createDragDrop([this.$refs.library].concat(categoryItems), {
                copy: true,
                moves(...args) {
                    const $handle = args[2];
                    return $handle.classList.contains('lpLibraryItemHandle');
                },
                accepts(...args) {
                    const $target = args[1];
                    const $sibling = args[3];
                    if ($target.classList.contains('library') || !$sibling || $sibling.classList.contains('lpItemsHeader')) {
                        return false; // header and footer are technically part of this list - exclude them both.
                    }
                    return true;
                },
            });
            if (!this.$el) {
                drake.destroy();
                return;
            }
            drake.on('drag', ($el) => {
                this.itemDragId = getDatasetInt($el, 'itemId');
            });
            drake.on('drop', ($el, $target) => {
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

<style lang="scss">
@import "../css/_library-items";
</style>
