<style lang="scss">
@import "../css/_gear-room-batch-bar";
</style>

<template>
    <div v-if="selected.length > 0" class="lpGearRoomBatchBar">
        <!-- Panel: Set type -->
        <div v-if="activeBatchPanel === 'category'" class="lpGearRoomBatchPanel">
            <div class="lpGearRoomBatchPanelHeader">
                <div class="lpGearRoomBatchPanelTitle">
                    {{ $t('gearroom.batchSetTypeButton') }} {{ $t('gearroom.batchForItems', { count: selected.length, plural: selected.length !== 1 ? 's' : '' }) }}
                </div>
                <button class="lpGearRoomBatchPanelClose" @click="activeBatchPanel = null">
                    ✕
                </button>
            </div>
            <div class="lpGearRoomBatchPanelRow">
                <span class="lpGearRoomBatchPanelLabel">{{ $t('gearroom.batchType') }}</span>
                <div class="lpBrandInputWrap">
                    <input ref="inputCategory" v-model="batchCategory" class="lpGearRoomBatchPanelInput" type="text" :placeholder="$t('gearroom.placeholderType')"
                           autocomplete="off"
                           @focus="openDropdown('type')"
                           @blur="closeDropdown('type')"
                           @keydown.down.prevent="moveDropdown('type', 1)"
                           @keydown.up.prevent="moveDropdown('type', -1)"
                           @keydown.enter.prevent="confirmDropdown('type')"
                           @keydown.escape="closeDropdown('type')"
                    >
                    <ul v-if="showTypeDropdown && filteredTypes.length" ref="typeDropdown" class="lpBrandSuggestions" role="listbox">
                        <li v-for="(cat, index) in filteredTypes" :key="cat" :class="{ active: dropdownActiveIndex.type === index }" role="option" :aria-selected="dropdownActiveIndex.type === index" @mousedown.prevent="selectType(cat)">
                            {{ cat }}
                        </li>
                    </ul>
                </div>
            </div>
            <button class="lpGearRoomBatchApply" @click="applyCategory">
                {{ $t('gearroom.apply') }}
            </button>
        </div>

        <!-- Panel: Set brand -->
        <div v-else-if="activeBatchPanel === 'brand'" class="lpGearRoomBatchPanel">
            <div class="lpGearRoomBatchPanelHeader">
                <div class="lpGearRoomBatchPanelTitle">
                    {{ $t('gearroom.batchSetBrandButton') }} {{ $t('gearroom.batchForItems', { count: selected.length, plural: selected.length !== 1 ? 's' : '' }) }}
                </div>
                <button class="lpGearRoomBatchPanelClose" @click="activeBatchPanel = null">
                    ✕
                </button>
            </div>
            <div class="lpGearRoomBatchPanelRow">
                <span class="lpGearRoomBatchPanelLabel">{{ $t('gearroom.batchBrand') }}</span>
                <div class="lpBrandInputWrap">
                    <input ref="inputBrand" v-model="batchBrand" class="lpGearRoomBatchPanelInput" type="text" :placeholder="$t('gearroom.placeholderBrand')"
                           autocomplete="off"
                           @focus="openDropdown('brand')"
                           @blur="closeDropdown('brand')"
                           @keydown.down.prevent="moveDropdown('brand', 1)"
                           @keydown.up.prevent="moveDropdown('brand', -1)"
                           @keydown.enter.prevent="confirmDropdown('brand')"
                           @keydown.escape="closeDropdown('brand')"
                    >
                    <ul v-if="showBrandDropdown && filteredBrands.length" ref="brandDropdown" class="lpBrandSuggestions" role="listbox">
                        <li v-for="(brand, index) in filteredBrands" :key="brand" :class="{ active: dropdownActiveIndex.brand === index }" role="option" :aria-selected="dropdownActiveIndex.brand === index" @mousedown.prevent="selectBrand(brand)">
                            {{ brand }}
                        </li>
                    </ul>
                </div>
            </div>
            <button class="lpGearRoomBatchApply" @click="applyBrand">
                {{ $t('gearroom.apply') }}
            </button>
        </div>

        <!-- Panel: Add tag -->
        <div v-else-if="activeBatchPanel === 'tag'" class="lpGearRoomBatchPanel">
            <div class="lpGearRoomBatchPanelHeader">
                <div class="lpGearRoomBatchPanelTitle">
                    {{ $t('gearroom.batchAddTagButton') }} {{ $t('gearroom.batchForItems', { count: selected.length, plural: selected.length !== 1 ? 's' : '' }) }}
                </div>
                <button class="lpGearRoomBatchPanelClose" @click="activeBatchPanel = null">
                    ✕
                </button>
            </div>
            <div class="lpGearRoomBatchPanelRow">
                <span class="lpGearRoomBatchPanelLabel">{{ $t('gearroom.batchTag') }}</span>
                <div class="lpBrandInputWrap">
                    <input ref="inputTag" v-model="batchTag" class="lpGearRoomBatchPanelInput" type="text" :placeholder="$t('gearroom.placeholderTag')"
                           autocomplete="off"
                           @focus="openDropdown('tag')"
                           @blur="closeDropdown('tag')"
                           @keydown.down.prevent="moveDropdown('tag', 1)"
                           @keydown.up.prevent="moveDropdown('tag', -1)"
                           @keydown.enter.prevent="confirmDropdown('tag')"
                           @keydown.escape="closeDropdown('tag')"
                    >
                    <ul v-if="showTagDropdown && filteredTags.length" ref="tagDropdown" class="lpBrandSuggestions" role="listbox">
                        <li v-for="(tag, index) in filteredTags" :key="tag" :class="{ active: dropdownActiveIndex.tag === index }" role="option" :aria-selected="dropdownActiveIndex.tag === index" @mousedown.prevent="selectTag(tag)">
                            {{ tag }}
                        </li>
                    </ul>
                </div>
            </div>
            <button class="lpGearRoomBatchApply" @click="applyTag">
                {{ $t('gearroom.apply') }}
            </button>
        </div>

        <!-- Panel: Merge -->
        <div v-else-if="activeBatchPanel === 'merge' && selected.length >= 2" class="lpGearRoomBatchPanel">
            <div class="lpGearRoomBatchPanelHeader">
                <div class="lpGearRoomBatchPanelTitle">
                    {{ $t('gearroom.batchMergeTitle') }}
                </div>
                <button class="lpGearRoomBatchPanelClose" @click="activeBatchPanel = null">
                    ✕
                </button>
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
            <button class="lpGearRoomBatchApply" :disabled="!mergeKeepId" @click="applyMerge">
                {{ $t('gearroom.batchMergeButton') }}
            </button>
        </div>

        <!-- Panel: Add to list -->
        <div v-else-if="activeBatchPanel === 'addToList'" class="lpGearRoomBatchPanel">
            <div class="lpGearRoomBatchPanelHeader">
                <div class="lpGearRoomBatchPanelTitle">
                    {{ $t('gearroom.batchAddToListButton') }} {{ $t('gearroom.batchForItems', { count: selected.length, plural: selected.length !== 1 ? 's' : '' }) }}
                </div>
                <button class="lpGearRoomBatchPanelClose" @click="activeBatchPanel = null">
                    ✕
                </button>
            </div>
            <div class="lpGearRoomBatchPanelRow">
                <span class="lpGearRoomBatchPanelLabel">{{ $t('gearroom.batchList') }}</span>
                <div class="lpBrandInputWrap">
                    <input ref="inputList" v-model="batchListName" class="lpGearRoomBatchPanelInput" type="text" :placeholder="$t('gearroom.placeholderList')"
                           autocomplete="off"
                           @focus="openListDropdown"
                           @blur="closeDropdown('list')"
                           @keydown.down.prevent="moveDropdown('list', 1)"
                           @keydown.up.prevent="moveDropdown('list', -1)"
                           @keydown.enter.prevent="confirmDropdown('list')"
                           @keydown.escape="closeDropdown('list')"
                    >
                    <ul v-if="showListDropdown && listDropdownOptions.length" ref="listDropdown" class="lpBrandSuggestions" role="listbox">
                        <li v-for="(option, index) in listDropdownOptions" :key="option.key" :class="{ active: dropdownActiveIndex.list === index, lpBrandSuggestionsCreate: option.type === 'create' }" role="option" :aria-selected="dropdownActiveIndex.list === index" @mousedown.prevent="selectListOption(option)">
                            {{ option.label }}
                        </li>
                    </ul>
                </div>
            </div>
            <div v-if="batchListId && batchListId !== '__new__'" class="lpGearRoomBatchPanelRow">
                <span class="lpGearRoomBatchPanelLabel">{{ $t('gearroom.batchListCat') }}</span>
                <div class="lpBrandInputWrap">
                    <input :value="selectedCatName" class="lpGearRoomBatchPanelInput" type="text" :placeholder="$t('gearroom.placeholderChoose')" readonly
                           @click="toggleListCatDropdown"
                           @focus="openDropdown('listCat')"
                           @blur="closeDropdown('listCat')"
                           @keydown.down.prevent="moveDropdown('listCat', 1)"
                           @keydown.up.prevent="moveDropdown('listCat', -1)"
                           @keydown.enter.prevent="confirmDropdown('listCat')"
                           @keydown.space.prevent="toggleListCatDropdown"
                           @keydown.escape="closeDropdown('listCat')"
                    >
                    <ul v-if="showListCatDropdown && categoriesForSelectedList.length" ref="listCatDropdown" class="lpBrandSuggestions" role="listbox">
                        <li v-for="(cat, index) in categoriesForSelectedList" :key="cat.id" :class="{ active: dropdownActiveIndex.listCat === index }" role="option" :aria-selected="dropdownActiveIndex.listCat === index" @mousedown.prevent="selectListCat(cat)">
                            {{ cat.name || $t('gearroom.unnamed') }}
                        </li>
                    </ul>
                </div>
            </div>
            <button class="lpGearRoomBatchApply" :disabled="!batchListId || (batchListId !== '__new__' && !batchCategoryId)" @click="applyAddToList">
                {{ $t('gearroom.apply') }}
            </button>
        </div>

        <!-- Action buttons -->
        <div class="lpGearRoomBatchActions">
            <span class="lpGearRoomBatchCount">{{ $t('gearroom.batchCount', { count: selected.length }) }}</span>
            <span class="lpGearRoomBatchSep">|</span>
            <button v-if="selected.length >= 2" class="lpGearRoomBatchAction" @click="togglePanel('merge')">
                {{ $t('gearroom.batchMerge') }}
            </button>
            <button v-if="selected.length >= 2" class="lpGearRoomBatchAction" @click="$emit('toggle-compare')">
                {{ compareOpen ? $t('gearroom.batchCloseCompare') : $t('gearroom.batchCompare') }}
            </button>
            <button class="lpGearRoomBatchAction" @click="$emit('batch-swap-name-desc')">
                {{ $t('gearroom.batchSwapNameDesc') }}
            </button>
            <button class="lpGearRoomBatchAction" @click="togglePanel('category')">
                {{ $t('gearroom.batchSetTypeButton') }}
            </button>
            <button class="lpGearRoomBatchAction" @click="togglePanel('brand')">
                {{ $t('gearroom.batchSetBrandButton') }}
            </button>
            <button class="lpGearRoomBatchAction" @click="togglePanel('tag')">
                {{ $t('gearroom.batchAddTagButton') }}
            </button>
            <button class="lpGearRoomBatchAction" @click="togglePanel('addToList')">
                {{ $t('gearroom.batchAddToListButton') }}
            </button>
            <button class="lpGearRoomBatchAction danger" @click="$emit('batch-delete')">
                {{ $t('gearroom.batchDelete') }}
            </button>
            <span class="lpGearRoomBatchSep">|</span>
            <button class="lpGearRoomBatchCancel" @click="$emit('update:selected', [])">
                {{ $t('gearroom.batchCancel') }}
            </button>
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
            dropdownActiveIndex: {
                type: -1,
                brand: -1,
                tag: -1,
                list: -1,
                listCat: -1,
            },
        };
    },
    computed: {
        existingBrands() {
            const brands = new Set();
            (this.allItems || []).forEach((item) => { if (item.brand) brands.add(item.brand); });
            return [...brands].sort((a, b) => a.localeCompare(b));
        },
        filteredTypes() {
            const q = (this.batchCategory || '').toLowerCase();
            return q
                ? this.availableCategories.filter((c) => c.toLowerCase().includes(q))
                : this.availableCategories;
        },
        filteredBrands() {
            const q = (this.batchBrand || '').toLowerCase();
            return q ? this.existingBrands.filter((b) => b.toLowerCase().includes(q)) : this.existingBrands;
        },
        existingTags() {
            const tags = new Set();
            (this.allItems || []).forEach((item) => { (item.tags || []).forEach((t) => tags.add(t)); });
            return [...tags].sort((a, b) => a.localeCompare(b));
        },
        filteredTags() {
            const q = (this.batchTag || '').toLowerCase();
            return q ? this.existingTags.filter((t) => t.toLowerCase().includes(q)) : this.existingTags;
        },
        filteredLists() {
            const q = (this.batchListName || '').toLowerCase();
            return q ? this.lists.filter((l) => l.name.toLowerCase().includes(q)) : this.lists;
        },
        showCreateList() {
            const q = (this.batchListName || '').trim();
            return q && !this.lists.some((l) => l.name.toLowerCase() === q.toLowerCase());
        },
        listDropdownOptions() {
            const options = [];
            if (this.showCreateList) {
                options.push({
                    key: '__create__',
                    type: 'create',
                    label: `${this.$t('gearroom.createList')} "${this.batchListName}"`,
                });
            }
            this.filteredLists.forEach((list) => {
                options.push({
                    key: list.id,
                    type: 'list',
                    label: list.name,
                    list,
                });
            });
            return options;
        },
        selectedListName() {
            const list = this.lists.find((l) => l.id === this.batchListId);
            return list ? list.name : '';
        },
        selectedCatName() {
            const cat = this.categoriesForSelectedList.find((c) => c.id === this.batchCategoryId);
            return cat ? (cat.name || this.$t('gearroom.unnamed')) : '';
        },
        categoriesForSelectedList() {
            if (!this.batchListId) return [];
            const list = this.lists.find((l) => l.id === this.batchListId);
            if (!list) return [];
            return (list.categoryIds || [])
                .map((id) => this.getCategoryById(id))
                .filter(Boolean);
        },
    },
    watch: {
        selected(val) {
            if (val.length === 0) this.activeBatchPanel = null;
        },
        batchCategory() {
            this.dropdownActiveIndex.type = -1;
        },
        batchBrand() {
            this.dropdownActiveIndex.brand = -1;
        },
        batchTag() {
            this.dropdownActiveIndex.tag = -1;
        },
        batchListName() {
            this.dropdownActiveIndex.list = -1;
        },
    },
    methods: {
        togglePanel(panel) {
            this.activeBatchPanel = this.activeBatchPanel === panel ? null : panel;
            if (this.activeBatchPanel) {
                const refMap = {
                    category: 'inputCategory', brand: 'inputBrand', tag: 'inputTag', addToList: 'inputList',
                };
                const ref = refMap[panel];
                if (ref) this.$nextTick(() => { this.$refs[ref] && this.$refs[ref].focus(); });
            }
        },
        dropdownOptions(kind) {
            const options = {
                type: this.filteredTypes,
                brand: this.filteredBrands,
                tag: this.filteredTags,
                list: this.listDropdownOptions,
                listCat: this.categoriesForSelectedList,
            };
            return options[kind] || [];
        },
        setDropdownOpen(kind, open) {
            const map = {
                type: 'showTypeDropdown',
                brand: 'showBrandDropdown',
                tag: 'showTagDropdown',
                list: 'showListDropdown',
                listCat: 'showListCatDropdown',
            };
            this[map[kind]] = open;
            if (!open) this.dropdownActiveIndex[kind] = -1;
        },
        openDropdown(kind) {
            this.setDropdownOpen(kind, true);
        },
        openListDropdown() {
            this.batchListId = '';
            this.openDropdown('list');
        },
        closeDropdown(kind) {
            this.setDropdownOpen(kind, false);
        },
        toggleListCatDropdown() {
            this.setDropdownOpen('listCat', !this.showListCatDropdown);
        },
        moveDropdown(kind, dir) {
            this.openDropdown(kind);
            const options = this.dropdownOptions(kind);
            if (!options.length) return;
            const max = options.length - 1;
            const current = this.dropdownActiveIndex[kind];
            let next = current + dir;
            if (current === -1) next = dir > 0 ? 0 : max;
            if (next < 0) next = max;
            if (next > max) next = 0;
            this.dropdownActiveIndex[kind] = next;
            this.$nextTick(() => {
                const list = this.$refs[`${kind}Dropdown`];
                const active = list?.querySelector('li.active');
                if (active) active.scrollIntoView({ block: 'nearest' });
            });
        },
        confirmDropdown(kind) {
            const index = this.dropdownActiveIndex[kind];
            const options = this.dropdownOptions(kind);
            if (index >= 0 && options[index]) {
                this.selectDropdownOption(kind, options[index]);
                return;
            }
            if (kind === 'type') this.applyCategory();
            if (kind === 'brand') this.applyBrand();
            if (kind === 'tag') this.applyTag();
            if (kind === 'list') {
                if (this.filteredLists.length) this.selectList(this.filteredLists[0]);
                else this.createAndSelectList();
            }
            if (kind === 'listCat' && this.categoriesForSelectedList.length) {
                this.selectListCat(this.categoriesForSelectedList[0]);
            }
        },
        selectDropdownOption(kind, option) {
            if (kind === 'type') this.selectType(option);
            if (kind === 'brand') this.selectBrand(option);
            if (kind === 'tag') this.selectTag(option);
            if (kind === 'list') this.selectListOption(option);
            if (kind === 'listCat') this.selectListCat(option);
        },
        getItemById(id) {
            return this.allItems.find((i) => i.id === id) || {};
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
            this.closeDropdown('type');
        },
        selectBrand(brand) {
            this.batchBrand = brand;
            this.closeDropdown('brand');
        },
        selectTag(tag) {
            this.batchTag = tag;
            this.closeDropdown('tag');
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
            this.closeDropdown('list');
        },
        selectListOption(option) {
            if (option.type === 'create') {
                this.createAndSelectList();
                return;
            }
            this.selectList(option.list);
        },
        createAndSelectList() {
            this.batchListId = '__new__';
            this.closeDropdown('list');
        },
        selectListCat(cat) {
            this.batchCategoryId = cat.id;
            this.closeDropdown('listCat');
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
