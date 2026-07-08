<style lang="scss">
@import "../css/_gear-room-batch-bar";
</style>

<template>
    <div v-if="selected.length > 0" class="lpGearRoomBatchBar">
        <!-- Panel: Set type -->
        <div v-if="activeBatchPanel === 'category'" class="lpGearRoomBatchPanel">
            <div class="lpGearRoomBatchPanelHeader">
                <div class="lpGearRoomBatchPanelTitle">{{ $t('gearroom.batchSetTypeButton') }} {{ $t('gearroom.batchForItems', { count: selected.length, plural: selected.length !== 1 ? 's' : '' }) }}</div>
                <button class="lpGearRoomBatchPanelClose" @click="activeBatchPanel = null">✕</button>
            </div>
            <div class="lpGearRoomBatchPanelRow">
                <span class="lpGearRoomBatchPanelLabel">{{ $t('gearroom.batchType') }}</span>
                <div class="lpBrandInputWrap">
                    <input ref="inputCategory" v-model="batchCategory" class="lpGearRoomBatchPanelInput" type="text" placeholder="ex: Shelter"
                        @focus="showTypeDropdown = true"
                        @blur="showTypeDropdown = false"
                        @keydown.enter="applyCategory">
                    <ul v-if="showTypeDropdown && filteredTypes.length" class="lpBrandSuggestions">
                        <li v-for="cat in filteredTypes" :key="cat" @mousedown.prevent="selectType(cat)">{{ cat }}</li>
                    </ul>
                </div>
            </div>
            <button class="lpGearRoomBatchApply" @click="applyCategory">Apply</button>
        </div>

        <!-- Panel: Set brand -->
        <div v-else-if="activeBatchPanel === 'brand'" class="lpGearRoomBatchPanel">
            <div class="lpGearRoomBatchPanelHeader">
                <div class="lpGearRoomBatchPanelTitle">{{ $t('gearroom.batchSetBrandButton') }} {{ $t('gearroom.batchForItems', { count: selected.length, plural: selected.length !== 1 ? 's' : '' }) }}</div>
                <button class="lpGearRoomBatchPanelClose" @click="activeBatchPanel = null">✕</button>
            </div>
            <div class="lpGearRoomBatchPanelRow">
                <span class="lpGearRoomBatchPanelLabel">{{ $t('gearroom.batchBrand') }}</span>
                <div class="lpBrandInputWrap">
                    <input ref="inputBrand" v-model="batchBrand" class="lpGearRoomBatchPanelInput" type="text" placeholder="ex: Patagonia"
                        @focus="showBrandDropdown = true"
                        @blur="showBrandDropdown = false"
                        @keydown.enter="applyBrand">
                    <ul v-if="showBrandDropdown && filteredBrands.length" class="lpBrandSuggestions">
                        <li v-for="brand in filteredBrands" :key="brand" @mousedown.prevent="selectBrand(brand)">{{ brand }}</li>
                    </ul>
                </div>
            </div>
            <button class="lpGearRoomBatchApply" @click="applyBrand">Apply</button>
        </div>

        <!-- Panel: Add tag -->
        <div v-else-if="activeBatchPanel === 'tag'" class="lpGearRoomBatchPanel">
            <div class="lpGearRoomBatchPanelHeader">
                <div class="lpGearRoomBatchPanelTitle">{{ $t('gearroom.batchAddTagButton') }} {{ $t('gearroom.batchForItems', { count: selected.length, plural: selected.length !== 1 ? 's' : '' }) }}</div>
                <button class="lpGearRoomBatchPanelClose" @click="activeBatchPanel = null">✕</button>
            </div>
            <div class="lpGearRoomBatchPanelRow">
                <span class="lpGearRoomBatchPanelLabel">{{ $t('gearroom.batchTag') }}</span>
                <div class="lpBrandInputWrap">
                    <input ref="inputTag" v-model="batchTag" class="lpGearRoomBatchPanelInput" type="text" placeholder="ex: bikepacking"
                        @focus="showTagDropdown = true"
                        @blur="showTagDropdown = false"
                        @keydown.enter="applyTag">
                    <ul v-if="showTagDropdown && filteredTags.length" class="lpBrandSuggestions">
                        <li v-for="tag in filteredTags" :key="tag" @mousedown.prevent="selectTag(tag)">{{ tag }}</li>
                    </ul>
                </div>
            </div>
            <button class="lpGearRoomBatchApply" @click="applyTag">Apply</button>
        </div>

        <!-- Panel: Merge -->
        <div v-else-if="activeBatchPanel === 'merge' && selected.length >= 2" class="lpGearRoomBatchPanel">
            <div class="lpGearRoomBatchPanelHeader">
                <div class="lpGearRoomBatchPanelTitle">{{ $t('gearroom.batchMergeTitle') }}</div>
                <button class="lpGearRoomBatchPanelClose" @click="activeBatchPanel = null">✕</button>
            </div>
            <div class="lpGearRoomBatchPanelRow" style="flex-direction:column;gap:6px;align-items:stretch">
                <button
                    v-for="id in selected"
                    :key="id"
                    :class="['lpGearRoomBatchAction', { 'lpGearRoomMergeKeep': mergeKeepId === id }]"
                    style="text-align:left"
                    @click="mergeKeepId = id"
                >
                    <strong>{{ itemDisplayName(getItemById(id)) }}</strong>
                    <span style="color:#aaa;margin-left:8px;font-size:11px">{{ getItemById(id).description }}</span>
                </button>
            </div>
            <button class="lpGearRoomBatchApply" :disabled="!mergeKeepId" @click="applyMerge">{{ $t('gearroom.batchMergeButton') }}</button>
        </div>

        <!-- Panel: Add to list -->
        <div v-else-if="activeBatchPanel === 'addToList'" class="lpGearRoomBatchPanel">
            <div class="lpGearRoomBatchPanelHeader">
                <div class="lpGearRoomBatchPanelTitle">{{ $t('gearroom.batchAddToListButton') }} {{ $t('gearroom.batchForItems', { count: selected.length, plural: selected.length !== 1 ? 's' : '' }) }}</div>
                <button class="lpGearRoomBatchPanelClose" @click="activeBatchPanel = null">✕</button>
            </div>
            <div class="lpGearRoomBatchPanelRow">
                <span class="lpGearRoomBatchPanelLabel">{{ $t('gearroom.batchList') }}</span>
                <div class="lpBrandInputWrap">
                    <input ref="inputList" v-model="batchListName" class="lpGearRoomBatchPanelInput" type="text" placeholder="Find or create a list..."
                        @focus="showListDropdown = true; batchListId = ''"
                        @blur="showListDropdown = false"
                        @keydown.enter="filteredLists.length ? selectList(filteredLists[0]) : createAndSelectList()">
                    <ul v-if="showListDropdown" class="lpBrandSuggestions">
                        <li v-if="showCreateList" class="lpBrandSuggestionsCreate" @mousedown.prevent="createAndSelectList()">+ Create "{{ batchListName }}"</li>
                        <li v-for="list in filteredLists" :key="list.id" @mousedown.prevent="selectList(list)">{{ list.name }}</li>
                    </ul>
                </div>
            </div>
            <div v-if="batchListId && batchListId !== '__new__'" class="lpGearRoomBatchPanelRow">
                <span class="lpGearRoomBatchPanelLabel">{{ $t('gearroom.batchListCat') }}</span>
                <div class="lpBrandInputWrap">
                    <input :value="selectedCatName" class="lpGearRoomBatchPanelInput" type="text" placeholder="— choose —" readonly
                        @click="showListCatDropdown = !showListCatDropdown"
                        @blur="showListCatDropdown = false">
                    <ul v-if="showListCatDropdown && categoriesForSelectedList.length" class="lpBrandSuggestions">
                        <li v-for="cat in categoriesForSelectedList" :key="cat.id" @mousedown.prevent="selectListCat(cat)">{{ cat.name || 'Unnamed' }}</li>
                    </ul>
                </div>
            </div>
            <button class="lpGearRoomBatchApply" :disabled="!batchListId || (batchListId !== '__new__' && !batchCategoryId)" @click="applyAddToList">Apply</button>
        </div>

        <!-- Action buttons -->
        <div class="lpGearRoomBatchActions">
            <span class="lpGearRoomBatchCount">{{ $t('gearroom.batchCount', { count: selected.length }) }}</span>
            <span class="lpGearRoomBatchSep">|</span>
            <button v-if="selected.length >= 2" class="lpGearRoomBatchAction" @click="togglePanel('merge')">{{ $t('gearroom.batchMerge') }}</button>
            <button v-if="selected.length >= 2" class="lpGearRoomBatchAction" @click="$emit('toggle-compare')">{{ compareOpen ? $t('gearroom.batchCloseCompare') : $t('gearroom.batchCompare') }}</button>
            <button class="lpGearRoomBatchAction" @click="$emit('batch-swap-name-desc')">{{ $t('gearroom.batchSwapNameDesc') }}</button>
            <button class="lpGearRoomBatchAction" @click="togglePanel('category')">{{ $t('gearroom.batchSetTypeButton') }}</button>
            <button class="lpGearRoomBatchAction" @click="togglePanel('brand')">{{ $t('gearroom.batchSetBrandButton') }}</button>
            <button class="lpGearRoomBatchAction" @click="togglePanel('tag')">{{ $t('gearroom.batchAddTagButton') }}</button>
            <button class="lpGearRoomBatchAction" @click="togglePanel('addToList')">{{ $t('gearroom.batchAddToListButton') }}</button>
            <button class="lpGearRoomBatchAction danger" @click="$emit('batch-delete')">{{ $t('gearroom.batchDelete') }}</button>
            <span class="lpGearRoomBatchSep">|</span>
            <button class="lpGearRoomBatchCancel" @click="$emit('update:selected', [])">{{ $t('gearroom.batchCancel') }}</button>
        </div>
    </div>
</template>

<script>
export default {
    name: 'GearRoomBatchBar',
    props: {
        selected: {
            type: Array,
            required: true,
        },
        availableCategories: {
            type: Array,
            default: () => [],
        },
        allItems: {
            type: Array,
            default: () => [],
        },
        lists: {
            type: Array,
            default: () => [],
        },
        library: {
            type: Object,
            default: null,
        },
        compareOpen: {
            type: Boolean,
            default: false,
        },
    },
    emits: [
        'update:selected',
        'batch-swap-name-desc',
        'batch-delete',
        'batch-category',
        'batch-brand',
        'batch-tag',
        'batch-merge',
        'batch-add-to-list',
        'batch-create-list',
        'toggle-compare',
    ],
    data() {
        return {
            activeBatchPanel: null,
            batchCategory: '',
            batchBrand: '',
            batchTag: '',
            mergeKeepId: null,
            batchListId: '',
            batchCategoryId: '',
            showBrandDropdown: false,
            showTypeDropdown: false,
            showTagDropdown: false,
            showListDropdown: false,
            showListCatDropdown: false,
            batchListName: '',
        };
    },
    computed: {
        existingBrands() {
            const brands = new Set();
            (this.allItems || []).forEach(item => { if (item.brand) brands.add(item.brand); });
            return [...brands].sort((a, b) => a.localeCompare(b));
        },
        filteredTypes() {
            const q = (this.batchCategory || '').toLowerCase();
            return q
                ? this.availableCategories.filter(c => c.toLowerCase().includes(q))
                : this.availableCategories;
        },
        filteredBrands() {
            const q = (this.batchBrand || '').toLowerCase();
            return q ? this.existingBrands.filter(b => b.toLowerCase().includes(q)) : this.existingBrands;
        },
        existingTags() {
            const tags = new Set();
            (this.allItems || []).forEach(item => { (item.tags || []).forEach(t => tags.add(t)); });
            return [...tags].sort((a, b) => a.localeCompare(b));
        },
        filteredTags() {
            const q = (this.batchTag || '').toLowerCase();
            return q ? this.existingTags.filter(t => t.toLowerCase().includes(q)) : this.existingTags;
        },
        filteredLists() {
            const q = (this.batchListName || '').toLowerCase();
            return q ? this.lists.filter(l => l.name.toLowerCase().includes(q)) : this.lists;
        },
        showCreateList() {
            const q = (this.batchListName || '').trim();
            return q && !this.lists.some(l => l.name.toLowerCase() === q.toLowerCase());
        },
        selectedListName() {
            const list = this.lists.find(l => l.id === this.batchListId);
            return list ? list.name : '';
        },
        selectedCatName() {
            const cat = this.categoriesForSelectedList.find(c => c.id === this.batchCategoryId);
            return cat ? (cat.name || 'Unnamed') : '';
        },
        categoriesForSelectedList() {
            if (!this.batchListId) return [];
            const list = this.lists.find(l => l.id === this.batchListId);
            if (!list) return [];
            return (list.categoryIds || [])
                .map(id => this.getCategoryById(id))
                .filter(Boolean);
        },
    },
    watch: {
        selected(val) {
            if (val.length === 0) this.activeBatchPanel = null;
        },
    },
    methods: {
        togglePanel(panel) {
            this.activeBatchPanel = this.activeBatchPanel === panel ? null : panel;
            if (this.activeBatchPanel) {
                const refMap = { category: 'inputCategory', brand: 'inputBrand', tag: 'inputTag', addToList: 'inputList' };
                const ref = refMap[panel];
                if (ref) this.$nextTick(() => { this.$refs[ref] && this.$refs[ref].focus(); });
            }
        },
        getItemById(id) {
            return this.allItems.find(i => i.id === id) || {};
        },
        getCategoryById(id) {
            if (this.library && this.library.getCategoryById) {
                return this.library.getCategoryById(id) || null;
            }
            return null;
        },
        itemDisplayName(item) {
            return [item.brand, item.name].filter(Boolean).join(' ');
        },
        applyCategory() {
            this.$emit('batch-category', this.batchCategory);
            this.batchCategory = '';
            this.activeBatchPanel = null;
        },
        selectType(cat) {
            this.batchCategory = cat;
            this.showTypeDropdown = false;
        },
        selectBrand(brand) {
            this.batchBrand = brand;
            this.showBrandDropdown = false;
        },
        selectTag(tag) {
            this.batchTag = tag;
            this.showTagDropdown = false;
        },
        applyBrand() {
            this.$emit('batch-brand', this.batchBrand.trim());
            this.batchBrand = '';
            this.activeBatchPanel = null;
        },
        applyTag() {
            if (!this.batchTag.trim()) return;
            this.$emit('batch-tag', this.batchTag.trim().toLowerCase());
            this.batchTag = '';
            this.activeBatchPanel = null;
        },
        applyMerge() {
            if (!this.mergeKeepId) return;
            this.$emit('batch-merge', this.mergeKeepId);
            this.mergeKeepId = null;
            this.activeBatchPanel = null;
        },
        selectList(list) {
            this.batchListId = list.id;
            this.batchListName = list.name;
            this.batchCategoryId = '';
            this.showListDropdown = false;
        },
        createAndSelectList() {
            this.batchListId = '__new__';
            this.showListDropdown = false;
        },
        selectListCat(cat) {
            this.batchCategoryId = cat.id;
            this.showListCatDropdown = false;
        },
        applyAddToList() {
            if (!this.batchListId) return;
            if (this.batchListId === '__new__') {
                this.$emit('batch-create-list', { name: this.batchListName.trim(), itemIds: [...this.selected] });
            } else {
                if (!this.batchCategoryId) return;
                this.$emit('batch-add-to-list', { categoryId: this.batchCategoryId, itemIds: [...this.selected] });
            }
            this.batchListId = '';
            this.batchListName = '';
            this.batchCategoryId = '';
            this.activeBatchPanel = null;
        },
    },
};
</script>
