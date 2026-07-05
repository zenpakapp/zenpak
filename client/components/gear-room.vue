<style lang="scss">
@import "../css/_gear-room";
</style>
<template>
    <div class="lpGearRoom">
        <div class="lpGearRoomHeader">
            <button class="lpButton lpSmall lpButtonSecondary" @click="$emit('close')">← Back to lists</button>
            <h1 class="lpGearRoomTitle">Your Gear</h1>
            <button class="lpButton lpSmall" @click="createItem">+ New item</button>
        </div>

        <button class="lpGearRoomFiltersToggle" @click="filtersOpen = !filtersOpen">
            {{ filtersOpen ? 'Hide filters' : 'Filters' }}
        </button>

        <div class="lpGearRoomBody">
            <div :class="['lpGearRoomFilters', { open: filtersOpen }]">
                <div>
                    <div class="lpGearRoomFiltersLabel">Search</div>
                    <input v-model="search" class="lpGearRoomSearch" type="text" placeholder="Name, brand, description…">
                </div>
                <div v-if="library.lists.length > 0">
                    <div class="lpGearRoomFiltersLabel">List</div>
                    <div class="lpGearRoomCategoryChips">
                        <button
                            :class="['lpGearRoomChip', { active: filterList === '' }]"
                            @click="filterList = ''; filterOrphan = false; filterStarred = false"
                        >All</button>
                        <button
                            v-for="list in library.lists"
                            :key="list.id"
                            :class="['lpGearRoomChip', { active: filterList === list.id }]"
                            @click="filterList = list.id; filterCategory = ''; filterOrphan = false; filterStarred = false"
                        >{{ list.name }}</button>
                    </div>
                </div>
                <div>
                    <div class="lpGearRoomFiltersLabel">Type</div>
                    <div class="lpGearRoomCategoryChips">
                        <button :class="['lpGearRoomChip', { active: filterCategory === '' && !filterOrphan && !filterStarred }]" @click="filterCategory = ''; filterOrphan = false; filterStarred = false">All</button>
                        <button
                            :class="['lpGearRoomChip', { active: filterOrphan }]"
                            @click="filterOrphan = !filterOrphan; filterCategory = ''; filterStarred = false; filterList = ''"
                        >No list</button>
                        <button
                            :class="['lpGearRoomChip', { active: filterStarred }]"
                            @click="filterStarred = !filterStarred; filterCategory = ''; filterOrphan = false; filterList = ''"
                        >★ Favorites</button>
                        <button
                            v-for="cat in availableCategories"
                            :key="cat"
                            :class="['lpGearRoomChip', { active: filterCategory === cat }]"
                            @click="filterCategory = cat; filterOrphan = false; filterStarred = false; filterList = ''"
                        >{{ cat }}</button>
                    </div>
                </div>
                <div>
                    <div class="lpGearRoomFiltersLabel">Weight (g)</div>
                    <div class="lpGearRoomWeightRange">
                        <input v-model.number="weightMin" class="lpGearRoomWeightInput" type="number" min="0" placeholder="Min">
                        <span>–</span>
                        <input v-model.number="weightMax" class="lpGearRoomWeightInput" type="number" min="0" placeholder="Max">
                    </div>
                </div>
            </div>

            <div class="lpGearRoomMain">
                <div class="lpGearRoomStats">
                    <span class="lpGearRoomStat"><strong>{{ totalWeightDisplay }}</strong> total</span>
                    <span class="lpGearRoomStat"><strong>{{ filteredItems.length }}</strong> items</span>
                    <span v-if="showTotalValue" class="lpGearRoomStat"><strong>€{{ totalValue }}</strong> value</span>
                </div>

                <div class="lpGearRoomTableWrap">
                    <table class="lpGearRoomTable">
                        <thead>
                            <tr>
                                <th class="lpGRCheckCol">
                                    <input
                                        type="checkbox"
                                        :checked="allSelected"
                                        :indeterminate.prop="someSelected"
                                        @change="toggleSelectAll"
                                    >
                                </th>
                                <th class="lpGRImgCol"></th>
                                <th class="lpGRSortable" @click="setSort('name')">
                                    Item {{ sortKey === 'name' ? (sortAsc ? '↑' : '↓') : '' }}
                                </th>
                                <th class="lpGRSortable lpGRStarCol" @click="setSort('starred')" title="Sort by favorites">
                                    ★ {{ sortKey === 'starred' ? (sortAsc ? '↑' : '↓') : '' }}
                                </th>
                                <th class="lpGRCategoryCol lpGRSortable" @click="setSort('category')">
                                    List category {{ sortKey === 'category' ? (sortAsc ? '↑' : '↓') : '' }}
                                </th>
                                <th class="lpGRWeightCol lpGRSortable" @click="setSort('weight')">
                                    Weight {{ sortKey === 'weight' ? (sortAsc ? '↑' : '↓') : '' }}
                                </th>
                                <th v-if="showPrice" class="lpGRPriceCol lpGRSortable" @click="setSort('price')">
                                    Price {{ sortKey === 'price' ? (sortAsc ? '↑' : '↓') : '' }}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="item in sortedItems" :key="item.id" @click.self="openItemDetail(item)">
                                <td class="lpGRCheckCol" @click.stop>
                                    <input v-model="selected" type="checkbox" :value="item.id">
                                </td>
                                <td class="lpGRImgCol" @click="openItemDetail(item)">
                                    <img v-if="itemThumb(item)" :src="itemThumb(item)" class="lpGearRoomThumb" :alt="item.name">
                                    <div v-else class="lpGearRoomThumbPlaceholder"></div>
                                </td>
                                <td @click="openItemDetail(item)">
                                    <div class="lpGearRoomItemName">{{ itemDisplayName(item) }}</div>
                                    <div v-if="item.description" class="lpGearRoomItemDesc">{{ item.description }}</div>
                                </td>
                                <td class="lpGRStarCol" @click="openItemDetail(item)">
                                    <span v-if="item.starred" class="lpGearRoomStarBadge">★</span>
                                </td>
                                <td class="lpGRCategoryCol" @click="openItemDetail(item)">
                                    <span v-if="item.category" class="lpGearRoomCategoryBadge">{{ item.category }}</span>
                                </td>
                                <td class="lpGRWeightCol" @click="openItemDetail(item)">{{ displayWeight(item.weight, item.authorUnit) }} {{ item.authorUnit }}</td>
                                <td v-if="showPrice" class="lpGRPriceCol" @click="openItemDetail(item)">{{ item.price > 0 ? '€' + item.price : '–' }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <gear-room-batch-bar
            :selected="selected"
            :available-categories="availableCategories"
            :all-items="allItems"
            :lists="library.lists"
            :library="library"
            :compare-open="compareOpen"
            @update:selected="selected = $event"
            @batch-swap-name-desc="batchSwapNameDesc"
            @batch-delete="batchDelete"
            @batch-category="applyBatchCategory"
            @batch-brand="applyBatchBrand"
            @batch-tag="applyBatchTag"
            @batch-merge="applyMerge"
            @batch-add-to-list="applyBatchAddToList"
            @batch-create-list="applyBatchCreateList"
            @toggle-compare="compareOpen = !compareOpen"
        />

        <gear-room-compare-panel
            :items="compareItems"
            :open="compareOpen"
            @close="compareOpen = false"
            @remove-item="id => selected = selected.filter(sid => sid !== id)"
        />
    </div>
</template>
<script>
import { openDialog } from '../services/dialogs';
import { useUtils } from '../composables/useUtils.js';
import { useGearRoomFilters } from '../composables/useGearRoomFilters.js';
import { openSpeedbump } from '../services/speedbump';
import GearRoomComparePanel from './gear-room-compare-panel.vue';
import GearRoomBatchBar from './gear-room-batch-bar.vue';

const { displayWeight } = useUtils();

export default {
    name: 'GearRoom',
    components: { GearRoomComparePanel, GearRoomBatchBar },
    emits: ['close'],
    setup() {
        return useGearRoomFilters();
    },
    data() {
        return {
            selected: [],
            filtersOpen: false,
            compareOpen: false,
        };
    },
    computed: {
        allSelected() {
            return this.filteredItems.length > 0 && this.filteredItems.every(i => this.selected.includes(i.id));
        },
        someSelected() {
            return this.filteredItems.some(i => this.selected.includes(i.id)) && !this.allSelected;
        },
        compareItems() {
            return this.selected
                .map(id => {
                    const item = this.library.getItemById(id);
                    if (!item) return null;
                    return { ...item, _usedInLists: this.itemUsedInLists(id) };
                })
                .filter(Boolean);
        },
    },
    methods: {
        displayWeight,
        itemThumb(item) {
            if (item.image) return `https://i.imgur.com/${item.image}s.jpg`;
            if (item.imageUrl) return item.imageUrl;
            return '';
        },
        toggleSelectAll() {
            if (this.allSelected) {
                this.selected.splice(0, this.selected.length);
            } else {
                const ids = this.filteredItems.map(i => i.id);
                this.selected.splice(0, this.selected.length, ...ids);
            }
        },
        openItemDetail(item) {
            const liveItem = this.library.getItemById(item.id);
            openDialog('itemDetail', { item: liveItem, categoryItem: null, category: null });
        },
        createItem() {
            this.$store.commit('newItem', { _isNew: true, name: '' });
            const newItem = this.library.items[this.library.items.length - 1];
            openDialog('itemDetail', { item: newItem, categoryItem: null, category: null, startEditing: true });
        },
        batchSwapNameDesc() {
            const ids = new Set(this.selected);
            this.allItems
                .filter(i => ids.has(i.id))
                .forEach(item => {
                    this.$store.commit('updateItem', { ...item, name: item.description, description: item.name });
                });
            this.selected.splice(0, this.selected.length);
        },
        applyBatchCategory(category) {
            const ids = new Set(this.selected);
            this.allItems
                .filter(i => ids.has(i.id))
                .forEach(item => {
                    this.$store.commit('updateItem', { ...item, category });
                });
            this.selected.splice(0, this.selected.length);
        },
        applyBatchBrand(brand) {
            const ids = new Set(this.selected);
            this.allItems
                .filter(i => ids.has(i.id))
                .forEach(item => {
                    this.$store.commit('updateItem', { ...item, brand });
                });
            this.selected.splice(0, this.selected.length);
        },
        applyBatchTag(tag) {
            const ids = new Set(this.selected);
            this.allItems
                .filter(i => ids.has(i.id))
                .forEach(item => {
                    const tags = [...(item.tags || [])];
                    if (!tags.includes(tag)) tags.push(tag);
                    this.$store.commit('updateItem', { ...item, tags });
                });
            this.selected.splice(0, this.selected.length);
        },
        applyBatchAddToList({ categoryId, itemIds }) {
            const category = this.library.getCategoryById(categoryId);
            if (!category) return;
            itemIds.forEach(itemId => {
                if (category.getCategoryItemById(itemId)) return;
                this.$store.commit('addItemToCategory', {
                    itemId,
                    categoryId,
                    dropIndex: category.categoryItems.length,
                });
            });
            this.selected.splice(0, this.selected.length);
        },
        applyBatchCreateList({ name, itemIds }) {
            this.$store.commit('newListNamed', name);
            const newList = this.library.lists[this.library.lists.length - 1];
            const categoryId = newList.categoryIds[0];
            this.applyBatchAddToList({ categoryId, itemIds });
        },
        batchDelete() {
            const count = this.selected.length;
            const ids = new Set(this.selected);
            openSpeedbump(
                () => {
                    this.allItems
                        .filter(i => ids.has(i.id))
                        .forEach(item => {
                            this.$store.commit('removeItem', item);
                        });
                    this.selected.splice(0, this.selected.length);
                },
                { body: `Delete ${count} item${count > 1 ? 's' : ''}? This cannot be undone.` },
            );
        },
        itemUsedInLists(itemId) {
            return this.library.lists.filter(list =>
                list.categoryIds.some(catId => {
                    const cat = this.library.getCategoryById(catId);
                    return cat && cat.categoryItems.some(ci => ci.itemId === itemId);
                })
            ).length;
        },
        applyMerge(keepId) {
            const removeIds = this.selected.filter(id => id !== keepId);
            openSpeedbump(
                () => {
                    removeIds.forEach(removeId => {
                        this.$store.commit('mergeItems', { keepId, removeId });
                    });
                    this.selected.splice(0, this.selected.length);
                },
                { body: `Merge ${this.selected.length} items into one? The others will be deleted from all lists.` },
            );
        },
    },
};
</script>
