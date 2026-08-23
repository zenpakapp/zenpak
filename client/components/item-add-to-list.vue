<template>
    <div class="itemDetailAddToList">
        <button ref="trigger" class="lpButton lpButtonGhost itemDetailAddBtn" @click="open = !open; selectedListId = null; addAsOptional = false">
            {{ $t('item.addToListButtonText') }}
        </button>
        <teleport to="body">
            <ul v-if="open" ref="dropdown" class="itemDetailAddDropdown" :style="dropdownStyle">
                <template v-if="!selectedListId">
                    <li
                        v-for="list in allLists"
                        :key="list.id"
                        :class="['itemDetailAddOption', { dimmed: itemUsedInLists.some(l => l.id === list.id) }]"
                        @click="selectedListId = list.id"
                    >
                        {{ list.name || $t('gearroom.unnamedList') }} ›
                    </li>
                    <li class="itemDetailAddCreate">
                        <div v-if="!creatingList" class="itemDetailAddNewList" @click="showNewListInput">
                            {{ $t('item.addToListNewList') }}
                        </div>
                        <div v-else class="itemDetailAddCreateRow">
                            <input
                                ref="newListInput"
                                v-model="newListName"
                                type="text"
                                class="itemDetailAddCreateInput"
                                :placeholder="$t('item.addToListPlaceholderNewList')"
                                @keydown.enter.prevent="createListAndNavigate"
                                @keydown.esc="creatingList = false"
                            >
                            <button class="lpButton lpSmall itemDetailAddCreateBtn" @click="createListAndNavigate">
                                {{ $t('item.addToListCreate') }}
                            </button>
                        </div>
                    </li>
                </template>
                <template v-else>
                    <li class="itemDetailAddListHeader itemDetailAddBack" @click="selectedListId = null">
                        {{ $t('item.addToListBack') }}
                    </li>
                    <li class="itemDetailAddOptionalRow">
                        <label class="itemDetailAddOptionalLabel">
                            <input
                                v-model="addAsOptional"
                                type="checkbox"
                                class="lpOptionalToggle"
                                :title="$t('item.optionalTitle')"
                            >
                            {{ $t('public.option') }}
                        </label>
                    </li>
                    <li
                        v-for="cat in selectedListCategories"
                        :key="cat.id"
                        :class="['itemDetailAddOption', { dimmed: cat.getCategoryItemById(item.id) }]"
                        @click="addToCategory(cat)"
                    >
                        {{ cat.name || 'Unnamed category' }}
                    </li>
                    <li class="itemDetailAddCreate">
                        <div class="itemDetailAddCreateRow">
                            <input
                                :value="newCategoryName"
                                type="text"
                                class="itemDetailAddCreateInput"
                                :placeholder="$t('item.addToListPlaceholderNewCategory')"
                                @input="newCategoryName = $event.target.value"
                                @keydown.enter.prevent="createCategoryAndAdd"
                            >
                            <button class="lpButton lpSmall itemDetailAddCreateBtn" @click="createCategoryAndAdd">
                                {{ $t('item.addToListCreate') }}
                            </button>
                        </div>
                    </li>
                </template>
            </ul>
        </teleport>
    </div>
</template>

<script>
export default {
    name: 'ItemAddToList',
    props: {
        item: { type: Object, required: true },
    },
    emits: ['added'],
    data() {
        return {
            open: false,
            selectedListId: null,
            newCategoryName: '',
            creatingList: false,
            newListName: '',
            addAsOptional: false,
            dropdownStyle: {},
        };
    },
    computed: {
        allLists() {
            const library = this.$store.state.library;
            return library ? library.lists : [];
        },
        selectedListCategories() {
            const library = this.$store.state.library;
            if (!library || !this.selectedListId) return [];
            const list = library.lists.find((l) => l.id === this.selectedListId);
            if (!list) return [];
            return list.categoryIds.map((id) => library.getCategoryById(id)).filter(Boolean);
        },
        itemUsedInLists() {
            const library = this.$store.state.library;
            if (!library || !this.item) return [];
            return library.lists.filter((list) => list.categoryIds.some((catId) => {
                const cat = library.getCategoryById(catId);
                return cat && cat.categoryItems.some((ci) => ci.itemId === this.item.id);
            }));
        },
    },
    watch: {
        open(val) {
            if (val) {
                this.$nextTick(this.positionDropdown);
                window.addEventListener('resize', this.positionDropdown);
                window.addEventListener('scroll', this.positionDropdown, true);
            } else {
                window.removeEventListener('resize', this.positionDropdown);
                window.removeEventListener('scroll', this.positionDropdown, true);
            }
        },
        selectedListId() {
            if (this.open) this.$nextTick(this.positionDropdown);
        },
    },
    mounted() {
        this._outsideHandler = (e) => {
            const dropdown = this.$refs.dropdown;
            if (this.open && !this.$el.contains(e.target) && !(dropdown && dropdown.contains(e.target))) {
                this.open = false;
                this.creatingList = false;
            }
        };
        document.addEventListener('click', this._outsideHandler, true);
    },
    beforeUnmount() {
        document.removeEventListener('click', this._outsideHandler, true);
        window.removeEventListener('resize', this.positionDropdown);
        window.removeEventListener('scroll', this.positionDropdown, true);
    },
    methods: {
        positionDropdown() {
            const btn = this.$refs.trigger;
            if (!btn) return;
            const r = btn.getBoundingClientRect();
            const gap = 8;
            const spaceAbove = r.top - gap;
            const spaceBelow = window.innerHeight - r.bottom - gap;
            const openUp = spaceBelow < spaceAbove;
            const maxH = Math.min(280, Math.floor(openUp ? spaceAbove : spaceBelow));
            const width = Math.min(Math.max(r.width, 320), window.innerWidth - gap * 2);
            const left = Math.max(gap, Math.min(r.left, window.innerWidth - width - gap));
            const style = {
                position: 'fixed',
                left: `${left}px`,
                width: `${width}px`,
                maxHeight: `${maxH}px`,
            };
            if (openUp) style.bottom = `${window.innerHeight - r.top + gap}px`;
            else style.top = `${r.bottom + gap}px`;
            this.dropdownStyle = style;
        },
        addToCategory(category) {
            this.$store.commit('addItemToCategory', {
                itemId: this.item.id,
                categoryId: category.id,
                dropIndex: category.categoryItems.length,
                optional: this.addAsOptional,
            });
            this.$emit('added');
        },
        showNewListInput() {
            this.creatingList = true;
            this.$nextTick(() => { this.$refs.newListInput && this.$refs.newListInput.focus(); });
        },
        createListAndNavigate() {
            const name = (this.newListName || '').trim();
            if (!name) return;
            this.$store.commit('newListNamed', name);
            const library = this.$store.state.library;
            const newList = library.lists[library.lists.length - 1];
            this.newListName = '';
            this.creatingList = false;
            this.selectedListId = newList.id;
        },
        createCategoryAndAdd() {
            const name = (this.newCategoryName || '').trim();
            if (!name) return;
            this.$store.commit('createCategoryAndAddItem', {
                itemId: this.item.id,
                name,
                listId: this.selectedListId,
                optional: this.addAsOptional,
            });
            this.$emit('added');
        },
    },
};
</script>

<style lang="scss" scoped>
@import "../css/_globals";

.itemDetailAddToList {
    position: relative;
    width: 100%;
}

.itemDetailAddBtn {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    width: 100%;
}

.itemDetailAddDropdown {
    background: $color-surface;
    border: 1px solid rgba(var(--color-accent-rgb), 0.12);
    border-radius: $radius-md;
    box-shadow: $shadow-popover;
    list-style: none;
    margin: 0;
    overflow-y: auto;
    padding: 4px 0;
    z-index: 3000;
}

.itemDetailAddListHeader {
    color: $color-text-muted;
    font-size: $fontSize-xs;
    font-weight: $fontWeight-bold;
    letter-spacing: 0.06em;
    padding: 10px 14px 4px;
    text-transform: uppercase;

    &:not(:first-child) {
        border-top: 1px solid $color-border;
        margin-top: 4px;
        padding-top: 12px;
    }
}

.itemDetailAddBack {
    color: $color-accent;
    cursor: pointer;
    font-size: $fontSize-sm;
    letter-spacing: normal;
    text-transform: none;

    &:hover {
        background: rgba(var(--color-accent-rgb), 0.06);
    }
}

.itemDetailAddOptionalRow {
    border-bottom: 1px solid $color-border;
    padding: 6px 14px;
}

.itemDetailAddOptionalLabel {
    align-items: center;
    color: $color-text-muted;
    cursor: pointer;
    display: flex;
    font-size: $fontSize-sm;
    gap: 6px;
}

.lpOptionalToggle {
    cursor: pointer;
    height: 14px;
    width: 14px;
}

.itemDetailAddOption {
    cursor: pointer;
    font-size: $fontSize-sm;
    list-style: none;
    padding: 10px 14px;

    &:hover {
        background: rgba(var(--color-accent-rgb), 0.06);
    }

    &.dimmed {
        color: $color-text-muted;
        cursor: default;
        pointer-events: none;
    }
}

.itemDetailAddNewList {
    color: $color-accent;
    cursor: pointer;
    font-size: $fontSize-sm;
    font-weight: $fontWeight-bold;
    padding: 2px 0;

    &:hover { opacity: 0.8; }
}

.itemDetailAddCreate {
    align-items: stretch;
    display: grid;
    gap: 6px;
    grid-template-columns: minmax(0, 1fr);
    margin-top: 0;
    padding: 6px 10px 10px;
}

.itemDetailAddCreateRow {
    display: grid;
    gap: 6px;
    grid-template-columns: minmax(0, 1fr) auto;
}

.itemDetailAddCreateInput {
    background: rgba(var(--color-accent-rgb), 0.04);
    border: 1px solid rgba(var(--color-accent-rgb), 0.14);
    border-radius: $radius-md;
    color: $color-text;
    flex: 1;
    font-size: $fontSize-sm;
    min-height: $control-height-sm;
    min-width: 0;
    padding: 0 10px;

    &:focus {
        border-color: $color-accent;
        box-shadow: 0 0 0 3px rgba(var(--color-accent-rgb), 0.12);
        outline: none;
    }
}

.itemDetailAddCreateBtn {
    min-height: $control-height-sm;
    white-space: nowrap;
}

@media (max-width: 640px) {
    .itemDetailAddCreateRow {
        grid-template-columns: minmax(0, 1fr);
    }
}
</style>
