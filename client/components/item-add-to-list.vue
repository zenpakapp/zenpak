<template>
    <div class="itemDetailAddToList">
        <button class="lpButton lpButtonSecondary itemDetailAddBtn" @click="open = !open; selectedListId = null">
            + Add to list ▾
        </button>
        <ul v-if="open" class="itemDetailAddDropdown">
            <template v-if="!selectedListId">
                <li
                    v-for="list in allLists"
                    :key="list.id"
                    :class="['itemDetailAddOption', { dimmed: itemUsedInLists.some(l => l.id === list.id) }]"
                    @click="selectedListId = list.id"
                >
                    {{ list.name || 'Unnamed list' }} ›
                </li>
                <li class="itemDetailAddCreate">
                    <div v-if="!creatingList" class="itemDetailAddNewList" @click="showNewListInput">+ New list</div>
                    <div v-else class="itemDetailAddCreateRow">
                        <input
                            ref="newListInput"
                            v-model="newListName"
                            type="text"
                            class="itemDetailAddCreateInput"
                            placeholder="List name"
                            @keydown.enter.prevent="createListAndNavigate"
                            @keydown.esc="creatingList = false"
                        >
                        <button class="lpButton lpSmall itemDetailAddCreateBtn" @click="createListAndNavigate">Create</button>
                    </div>
                </li>
            </template>
            <template v-else>
                <li class="itemDetailAddListHeader itemDetailAddBack" @click="selectedListId = null">‹ Back</li>
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
                            placeholder="New category"
                            @input="newCategoryName = $event.target.value"
                            @keydown.enter.prevent="createCategoryAndAdd"
                        >
                        <button class="lpButton lpSmall itemDetailAddCreateBtn" @click="createCategoryAndAdd">
                            Create
                        </button>
                    </div>
                </li>
            </template>
        </ul>
    </div>
</template>

<script>
export default {
    name: 'ItemAddToList',
    props: {
        item: { type: Object, required: true },
    },
    emits: ['added'],
    mounted() {
        this._outsideHandler = (e) => {
            if (this.open && !this.$el.contains(e.target)) {
                this.open = false;
                this.creatingList = false;
            }
        };
        document.addEventListener('click', this._outsideHandler, true);
    },
    beforeUnmount() {
        document.removeEventListener('click', this._outsideHandler, true);
    },
    data() {
        return {
            open: false,
            selectedListId: null,
            newCategoryName: '',
            creatingList: false,
            newListName: '',
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
            const list = library.lists.find(l => l.id === this.selectedListId);
            if (!list) return [];
            return list.categoryIds.map(id => library.getCategoryById(id)).filter(Boolean);
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
        addToCategory(category) {
            this.$store.commit('addItemToCategory', {
                itemId: this.item.id,
                categoryId: category.id,
                dropIndex: category.categoryItems.length,
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
}

.itemDetailAddToList {
    width: 100%;
}

.itemDetailAddBtn {
    white-space: nowrap;
    width: 100%;
}

.itemDetailAddDropdown {
    background: $color-surface;
    border: 1px solid rgba(var(--color-accent-rgb), 0.12);
    border-radius: $radius-md;
    bottom: 100%;
    box-shadow: $shadow-popover;
    left: 0;
    list-style: none;
    margin: 0 0 8px;
    min-width: 320px;
    padding: 4px 0;
    padding-left: 0;
    position: absolute;
    z-index: 10;
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
    .itemDetailAddDropdown {
        min-width: min(320px, calc(100vw - 72px));
    }

    .itemDetailAddCreateRow {
        grid-template-columns: minmax(0, 1fr);
    }
}
</style>
