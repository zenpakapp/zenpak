<style lang="scss">
@import "../css/_globals";

.lpGearRoomBatchBar {
    align-items: center;
    background: #1a1a1a;
    border-radius: 12px;
    bottom: 24px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    color: #fff;
    display: flex;
    flex-wrap: wrap;
    font-size: $fontSize-sm;
    gap: 8px;
    left: 50%;
    padding: 10px 16px;
    position: fixed;
    transform: translateX(-50%);
    white-space: nowrap;
    z-index: $belowDialog;
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
    border: 1px solid $color-border;
    border-radius: $radius-md;
    bottom: 72px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
    left: 50%;
    padding: 16px;
    position: fixed;
    transform: translateX(-50%);
    width: 300px;
    z-index: $belowDialog;
}

.lpGearRoomBatchPanelTitle {
    color: $color-text-muted;
    font-size: $fontSize-sm;
    font-weight: $fontWeight-bold;
    margin-bottom: 12px;
    text-transform: uppercase;
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
    width: 70px;
}

.lpGearRoomBatchPanelInput,
.lpGearRoomBatchPanelSelect {
    background: $color-surface;
    border: 1px solid $color-border;
    border-radius: $radius-sm;
    color: $color-text;
    flex: 1;
    font-size: $fontSize-sm;
    min-height: 32px;
    padding: 0 8px;

    &:focus {
        border-color: $color-accent;
        outline: none;
    }
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
    <div>
        <!-- Batch actions bar -->
        <div v-if="selected.length > 0" class="lpGearRoomBatchBar">
            <span class="lpGearRoomBatchCount">{{ selected.length }} selected</span>
            <span class="lpGearRoomBatchSep">|</span>
            <button v-if="selected.length >= 2" class="lpGearRoomBatchAction" @click="togglePanel('merge')">⇄ Merge</button>
            <button v-if="selected.length >= 2" class="lpGearRoomBatchAction" @click="$emit('toggle-compare')">{{ compareOpen ? 'Close compare' : '⇔ Compare' }}</button>
            <button class="lpGearRoomBatchAction" @click="$emit('batch-swap-name-desc')">Swap name ↔ desc</button>
            <button class="lpGearRoomBatchAction" @click="togglePanel('category')">Set category</button>
            <button class="lpGearRoomBatchAction" @click="togglePanel('tag')">Add tag</button>
            <button class="lpGearRoomBatchAction" @click="togglePanel('addToList')">Add to list</button>
            <button class="lpGearRoomBatchAction danger" @click="$emit('batch-delete')">Delete</button>
            <span class="lpGearRoomBatchSep">|</span>
            <button class="lpGearRoomBatchCancel" @click="$emit('update:selected', [])">✕ Cancel</button>
        </div>

        <!-- Category panel -->
        <div v-if="activeBatchPanel === 'category'" class="lpGearRoomBatchPanel">
            <div class="lpGearRoomBatchPanelTitle">Set category for {{ selected.length }} items</div>
            <div class="lpGearRoomBatchPanelRow">
                <span class="lpGearRoomBatchPanelLabel">Type</span>
                <select v-model="batchCategory" class="lpGearRoomBatchPanelSelect">
                    <option value="">— none —</option>
                    <option v-for="cat in availableCategories" :key="cat" :value="cat">{{ cat }}</option>
                </select>
            </div>
            <button class="lpGearRoomBatchApply" @click="applyCategory">Apply</button>
        </div>

        <!-- Tag panel -->
        <div v-if="activeBatchPanel === 'tag'" class="lpGearRoomBatchPanel">
            <div class="lpGearRoomBatchPanelTitle">Add tag to {{ selected.length }} items</div>
            <div class="lpGearRoomBatchPanelRow">
                <span class="lpGearRoomBatchPanelLabel">Tag</span>
                <input
                    v-model="batchTag"
                    class="lpGearRoomBatchPanelInput"
                    type="text"
                    placeholder="ex: bikepacking"
                    @keydown.enter="applyTag"
                >
            </div>
            <button class="lpGearRoomBatchApply" @click="applyTag">Apply</button>
        </div>

        <!-- Merge panel -->
        <div v-if="activeBatchPanel === 'merge' && selected.length >= 2" class="lpGearRoomBatchPanel">
            <div class="lpGearRoomBatchPanelTitle">Merge — keep which item?</div>
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

        <!-- Add to list panel -->
        <div v-if="activeBatchPanel === 'addToList'" class="lpGearRoomBatchPanel">
            <div class="lpGearRoomBatchPanelTitle">Add {{ selected.length }} item{{ selected.length !== 1 ? 's' : '' }} to list</div>
            <div class="lpGearRoomBatchPanelRow">
                <span class="lpGearRoomBatchPanelLabel">List</span>
                <select v-model="batchListId" class="lpGearRoomBatchPanelSelect" @change="batchCategoryId = ''">
                    <option value="">— choose —</option>
                    <option v-for="list in lists" :key="list.id" :value="list.id">{{ list.name }}</option>
                </select>
            </div>
            <div class="lpGearRoomBatchPanelRow">
                <span class="lpGearRoomBatchPanelLabel">Category</span>
                <select v-model="batchCategoryId" class="lpGearRoomBatchPanelSelect" :disabled="!batchListId">
                    <option value="">— choose —</option>
                    <option v-for="cat in categoriesForSelectedList" :key="cat.id" :value="cat.id">{{ cat.name || 'Unnamed' }}</option>
                </select>
            </div>
            <button class="lpGearRoomBatchApply" :disabled="!batchListId || !batchCategoryId" @click="applyAddToList">Apply</button>
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
        'batch-tag',
        'batch-merge',
        'batch-add-to-list',
        'toggle-compare',
    ],
    data() {
        return {
            activeBatchPanel: null,
            batchCategory: '',
            batchTag: '',
            mergeKeepId: null,
            batchListId: '',
            batchCategoryId: '',
        };
    },
    computed: {
        categoriesForSelectedList() {
            if (!this.batchListId) return [];
            const list = this.lists.find(l => l.id === this.batchListId);
            if (!list) return [];
            return (list.categoryIds || [])
                .map(id => this.getCategoryById(id))
                .filter(Boolean);
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
            for (const list of this.lists) {
                if (list.getCategoryById) {
                    const cat = list.getCategoryById(id);
                    if (cat) return cat;
                }
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
