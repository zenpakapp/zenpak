<style lang="scss">
@import "../css/_globals";

.lpGearRoomBatchBar {
    background: #1a1a1a;
    border-radius: 12px;
    bottom: 24px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    color: #fff;
    display: flex;
    flex-direction: column;
    font-size: $fontSize-sm;
    left: 50%;
    max-width: calc(100vw - 32px);
    overflow: hidden;
    position: fixed;
    transform: translateX(-50%);
    z-index: $belowDialog;
}

.lpGearRoomBatchActions {
    align-items: center;
    display: flex;
    flex-wrap: nowrap;
    gap: 8px;
    overflow-x: auto;
    padding: 10px 16px;
    white-space: nowrap;
}

.lpGearRoomBatchCount {
    background: $color-accent;
    border-radius: 999px;
    font-size: 12px;
    font-weight: $fontWeight-bold;
    padding: 2px 8px;
}

.lpGearRoomBatchSep {
    color: #555;
}

.lpGearRoomBatchAction {
    background: #2a2a2a;
    border: 1px solid #444;
    border-radius: $radius-sm;
    color: #eee;
    cursor: pointer;
    font-family: $font-family-base;
    font-size: $fontSize-sm;
    padding: 5px 12px;

    &:hover {
        background: #3a3a3a;
    }

    &.danger {
        border-color: #882222;
        color: #ff7070;
    }
}

.lpGearRoomBatchCancel {
    background: none;
    border: none;
    color: #777;
    cursor: pointer;
    font-family: $font-family-base;
    font-size: $fontSize-sm;
    padding: 4px;

    &:hover {
        color: #aaa;
    }
}

.lpGearRoomBatchPanel {
    background: $color-surface;
    border-bottom: 1px solid $color-border;
    color: $color-text;
    padding: 14px 16px;
}

.lpBrandInputWrap {
    flex: 1;
}

.lpBrandSelectWrap {
    flex: 1;
    position: relative;

    &::after {
        color: $color-text-muted;
        content: "⌄";
        font-size: 18px;
        line-height: 1;
        pointer-events: none;
        position: absolute;
        right: 8px;
        top: 50%;
        transform: translateY(-54%);
    }
}

.lpBrandSuggestions {
    background: $color-surface;
    border: 1px solid $color-border;
    border-radius: $radius-md;
    list-style: none;
    margin: 4px 0 0;
    max-height: 160px;
    overflow-y: auto;
    padding: 4px 0;

    li {
        cursor: pointer;
        font-size: $fontSize-sm;
        padding: 6px 12px;

        &:hover {
            background: rgba(var(--color-accent-rgb), 0.08);
        }
    }
}

.lpGearRoomBatchPanelHeader {
    align-items: center;
    display: flex;
    justify-content: space-between;
    margin-bottom: 12px;
}

.lpGearRoomBatchPanelTitle {
    color: $color-text-muted;
    font-size: $fontSize-sm;
    font-weight: $fontWeight-bold;
    text-transform: uppercase;
}

.lpGearRoomBatchPanelClose {
    background: none;
    border: none;
    color: $color-text-muted;
    cursor: pointer;
    font-size: 14px;
    line-height: 1;
    padding: 0 2px;

    &:hover { color: $color-text; }
}

.lpGearRoomBatchPanelRow {
    align-items: center;
    display: flex;
    gap: 8px;
    margin-bottom: 10px;
}

.lpGearRoomBatchPanelLabel {
    color: $color-text-muted;
    flex-shrink: 0;
    font-size: $fontSize-sm;
    width: 60px;
}

.lpGearRoomBatchPanelInput,
.lpGearRoomBatchPanelSelect {
    appearance: none;
    background: $color-surface;
    border: 1px solid $color-border;
    border-radius: $radius-sm;
    color: $color-text;
    flex: 1;
    font-family: $font-family-base;
    font-size: $fontSize-sm;
    min-height: 32px;
    min-width: 0;
    padding: 0 8px;
    width: 100%;

    &:focus {
        border-color: $color-accent;
        outline: none;
    }

    &:disabled {
        opacity: 0.4;
    }
}

.lpGearRoomBatchPanelSelect {
    padding-right: 24px;
}

.lpGearRoomMergeKeep {
    background: rgba(var(--color-accent-rgb), 0.15) !important;
    border-color: $color-accent !important;
    color: $color-accent !important;
}

.lpGearRoomBatchApply {
    background: $color-accent;
    border: none;
    border-radius: $radius-sm;
    color: #fff;
    cursor: pointer;
    font-family: $font-family-base;
    font-size: $fontSize-sm;
    margin-top: 4px;
    padding: 7px 16px;
    width: 100%;

    &:hover {
        opacity: 0.9;
    }
}

@media (max-width: 768px) {
    .lpGearRoomBatchBar {
        left: 16px;
        right: 16px;
        transform: none;
        width: auto;
    }
}
</style>

<template>
    <div v-if="selected.length > 0" class="lpGearRoomBatchBar">
        <!-- Panel: Set type -->
        <div v-if="activeBatchPanel === 'category'" class="lpGearRoomBatchPanel">
            <div class="lpGearRoomBatchPanelHeader">
                <div class="lpGearRoomBatchPanelTitle">Set type for {{ selected.length }} item{{ selected.length !== 1 ? 's' : '' }}</div>
                <button class="lpGearRoomBatchPanelClose" @click="activeBatchPanel = null">✕</button>
            </div>
            <div class="lpGearRoomBatchPanelRow">
                <span class="lpGearRoomBatchPanelLabel">Type</span>
                <div class="lpBrandInputWrap">
                    <input v-model="batchCategory" class="lpGearRoomBatchPanelInput" type="text" placeholder="ex: Shelter"
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
                <div class="lpGearRoomBatchPanelTitle">Set brand for {{ selected.length }} item{{ selected.length !== 1 ? 's' : '' }}</div>
                <button class="lpGearRoomBatchPanelClose" @click="activeBatchPanel = null">✕</button>
            </div>
            <div class="lpGearRoomBatchPanelRow">
                <span class="lpGearRoomBatchPanelLabel">Brand</span>
                <div class="lpBrandInputWrap">
                    <input v-model="batchBrand" class="lpGearRoomBatchPanelInput" type="text" placeholder="ex: Patagonia"
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
                <div class="lpGearRoomBatchPanelTitle">Add tag to {{ selected.length }} item{{ selected.length !== 1 ? 's' : '' }}</div>
                <button class="lpGearRoomBatchPanelClose" @click="activeBatchPanel = null">✕</button>
            </div>
            <div class="lpGearRoomBatchPanelRow">
                <span class="lpGearRoomBatchPanelLabel">Tag</span>
                <div class="lpBrandInputWrap">
                    <input v-model="batchTag" class="lpGearRoomBatchPanelInput" type="text" placeholder="ex: bikepacking"
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
                <div class="lpGearRoomBatchPanelTitle">Merge — keep which item?</div>
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
            <button class="lpGearRoomBatchApply" :disabled="!mergeKeepId" @click="applyMerge">Merge &amp; delete duplicate</button>
        </div>

        <!-- Panel: Add to list -->
        <div v-else-if="activeBatchPanel === 'addToList'" class="lpGearRoomBatchPanel">
            <div class="lpGearRoomBatchPanelHeader">
                <div class="lpGearRoomBatchPanelTitle">Add {{ selected.length }} item{{ selected.length !== 1 ? 's' : '' }} to list</div>
                <button class="lpGearRoomBatchPanelClose" @click="activeBatchPanel = null">✕</button>
            </div>
            <div class="lpGearRoomBatchPanelRow">
                <span class="lpGearRoomBatchPanelLabel">List</span>
                <div class="lpBrandSelectWrap">
                    <select v-model="batchListId" class="lpGearRoomBatchPanelSelect" @change="batchCategoryId = ''">
                        <option value="">— choose —</option>
                        <option v-for="list in lists" :key="list.id" :value="list.id">{{ list.name }}</option>
                    </select>
                </div>
            </div>
            <div class="lpGearRoomBatchPanelRow">
                <span class="lpGearRoomBatchPanelLabel">List cat.</span>
                <div class="lpBrandSelectWrap">
                    <select v-model="batchCategoryId" class="lpGearRoomBatchPanelSelect" :disabled="!batchListId">
                        <option value="">— choose —</option>
                        <option v-for="cat in categoriesForSelectedList" :key="cat.id" :value="cat.id">{{ cat.name || 'Unnamed' }}</option>
                    </select>
                </div>
            </div>
            <button class="lpGearRoomBatchApply" :disabled="!batchListId || !batchCategoryId" @click="applyAddToList">Apply</button>
        </div>

        <!-- Action buttons -->
        <div class="lpGearRoomBatchActions">
            <span class="lpGearRoomBatchCount">{{ selected.length }} selected</span>
            <span class="lpGearRoomBatchSep">|</span>
            <button v-if="selected.length >= 2" class="lpGearRoomBatchAction" @click="togglePanel('merge')">⇄ Merge</button>
            <button v-if="selected.length >= 2" class="lpGearRoomBatchAction" @click="$emit('toggle-compare')">{{ compareOpen ? 'Close compare' : '⇔ Compare' }}</button>
            <button class="lpGearRoomBatchAction" @click="$emit('batch-swap-name-desc')">Swap name ↔ desc</button>
            <button class="lpGearRoomBatchAction" @click="togglePanel('category')">Set type</button>
            <button class="lpGearRoomBatchAction" @click="togglePanel('brand')">Set brand</button>
            <button class="lpGearRoomBatchAction" @click="togglePanel('tag')">Add tag</button>
            <button class="lpGearRoomBatchAction" @click="togglePanel('addToList')">Add to list</button>
            <button class="lpGearRoomBatchAction danger" @click="$emit('batch-delete')">Delete</button>
            <span class="lpGearRoomBatchSep">|</span>
            <button class="lpGearRoomBatchCancel" @click="$emit('update:selected', [])">✕ Cancel</button>
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
        applyAddToList() {
            if (!this.batchListId || !this.batchCategoryId) return;
            this.$emit('batch-add-to-list', {
                categoryId: this.batchCategoryId,
                itemIds: [...this.selected],
            });
            this.batchListId = '';
            this.batchCategoryId = '';
            this.activeBatchPanel = null;
        },
    },
};
</script>
