<template>
    <div class="itemDetailAddToList">
        <button ref="trigger" class="lpButton lpButtonGhost itemDetailAddBtn" aria-haspopup="menu" :aria-expanded="open ? 'true' : 'false'" :aria-controls="menuId" @click="open = !open; selectedListId = null; addAsOptional = false">
            {{ $t('item.addToListButtonText') }}
        </button>
        <teleport to="body">
            <ul v-if="open" :id="menuId" ref="dropdown" class="itemDetailAddDropdown" role="menu" :aria-label="$t('item.addToListButtonText')" :style="dropdownStyle" @keydown="onMenuKeydown">
                <template v-if="!selectedListId">
                    <li
                        v-if="currentList"
                        class="itemDetailAddOption itemDetailAddCurrent"
                        role="menuitem"
                        tabindex="0"
                        @click="selectedListId = currentList.id"
                        @keydown.enter.prevent="selectedListId = currentList.id"
                        @keydown.space.prevent="selectedListId = currentList.id"
                    >
                        <span>{{ $t('item.addToListCurrent') }} : {{ currentList.name || $t('gearroom.unnamedList') }}</span>
                        <span class="itemDetailAddNext" aria-hidden="true">›</span>
                    </li>
                    <li
                        v-for="list in otherLists"
                        :key="list.id"
                        :class="['itemDetailAddOption', { dimmed: itemUsedInLists.some(l => l.id === list.id) }]"
                        role="menuitem"
                        :tabindex="itemUsedInLists.some(l => l.id === list.id) ? -1 : 0"
                        :aria-disabled="itemUsedInLists.some(l => l.id === list.id) ? 'true' : null"
                        @click="selectedListId = list.id"
                        @keydown.enter.prevent="selectedListId = list.id"
                        @keydown.space.prevent="selectedListId = list.id"
                    >
                        <span>{{ list.name || $t('gearroom.unnamedList') }}</span>
                        <span class="itemDetailAddNext" aria-hidden="true">›</span>
                    </li>
                    <li class="itemDetailAddCreate">
                        <div v-if="!creatingList" class="itemDetailAddNewList" role="menuitem" tabindex="0" @click="showNewListInput" @keydown.enter.prevent="showNewListInput" @keydown.space.prevent="showNewListInput">
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
                    <li class="itemDetailAddListHeader itemDetailAddBack" role="menuitem" tabindex="0" @click="selectedListId = null" @keydown.enter.prevent="selectedListId = null" @keydown.space.prevent="selectedListId = null">
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
                        role="menuitem"
                        :tabindex="cat.getCategoryItemById(item.id) ? -1 : 0"
                        :aria-disabled="cat.getCategoryItemById(item.id) ? 'true' : null"
                        @click="addToCategory(cat)"
                        @keydown.enter.prevent="addToCategory(cat)"
                        @keydown.space.prevent="addToCategory(cat)"
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
import { KEYUP_SWALLOW_MS } from '../services/timings';
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
        menuId() {
            return `itemAddToListMenu-${this.item.id}`;
        },
        allLists() {
            const library = this.$store.state.library;
            return library ? library.lists : [];
        },
        // The list open in the editor: the quickest target, so it comes first.
        currentList() {
            const library = this.$store.state.library;
            return library && library.defaultListId ? library.getListById(library.defaultListId) : null;
        },
        otherLists() {
            return this.allLists.filter((list) => !this.currentList || list.id !== this.currentList.id);
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
                this.$nextTick(() => {
                    this.positionDropdown();
                    this.focusFirstEntry();
                });
                window.addEventListener('resize', this.positionDropdown);
                window.addEventListener('scroll', this.positionDropdown, true);
            } else {
                window.removeEventListener('resize', this.positionDropdown);
                window.removeEventListener('scroll', this.positionDropdown, true);
            }
        },
        selectedListId() {
            if (!this.open) return;
            this.$nextTick(() => {
                this.positionDropdown();
                this.focusFirstEntry();
            });
        },
    },
    mounted() {
        this._outsideHandler = (e) => {
            const dropdown = this.$refs.dropdown;
            if (this.open && !this.$el.contains(e.target) && !(dropdown && dropdown.contains(e.target))) {
                this.open = false;
                this.creatingList = false;
                this.newListName = '';
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
        // The menu is drawn in <body> so the dialog cannot clip it, which also puts it outside the
        // dialog's Tab order: the keyboard goes in by focus() on opening and moves by the arrows.
        entries() {
            const menu = this.$refs.dropdown;
            if (!menu) return [];
            return Array.from(menu.querySelectorAll('[role="menuitem"]:not([aria-disabled="true"]), input, button'));
        },
        focusFirstEntry() {
            const [first] = this.entries();
            if (first) first.focus();
        },
        closeMenu() {
            this.open = false;
            this.creatingList = false;
            this.$nextTick(() => { this.$refs.trigger && this.$refs.trigger.focus(); });
        },
        onMenuKeydown(evt) {
            const entries = this.entries();
            const current = entries.indexOf(document.activeElement);
            const isText = evt.target && evt.target.tagName === 'INPUT' && evt.target.type === 'text';
            let next = null;
            if (evt.key === 'ArrowDown') next = (current + 1) % entries.length;
            else if (evt.key === 'ArrowUp') next = (current - 1 + entries.length) % entries.length;
            else if (evt.key === 'Home' && !isText) next = 0;
            else if (evt.key === 'End' && !isText) next = entries.length - 1;
            if (next !== null && entries.length) {
                evt.preventDefault();
                entries[next].focus();
                return;
            }
            if (evt.key === 'Escape') {
                // The new-list field cancels itself on Escape; a second press closes the menu.
                if (isText && this.creatingList) return;
                // Closes the menu only, not the dialog behind it. The dialog closes on the keyup of
                // Escape (modal.vue), which would reach it once the focus is back on the button:
                // swallow that one keyup.
                evt.preventDefault();
                evt.stopPropagation();
                const swallowKeyup = (e) => {
                    if (e.key !== 'Escape') return;
                    e.stopPropagation();
                    window.removeEventListener('keyup', swallowKeyup, true);
                };
                window.addEventListener('keyup', swallowKeyup, true);
                setTimeout(() => window.removeEventListener('keyup', swallowKeyup, true), KEYUP_SWALLOW_MS);
                this.closeMenu();
            } else if (evt.key === 'Tab') {
                // Tab leaves the menu: back to the button, and the default move goes on from there.
                this.open = false;
                this.creatingList = false;
                if (this.$refs.trigger) this.$refs.trigger.focus();
            }
        },
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
    border-radius: $radius-lg;
    box-shadow: $shadow-popover;
    list-style: none;
    margin: 0;
    overflow-y: auto;
    padding: $space-4 0;
    z-index: $popover;
}

.itemDetailAddListHeader {
    color: $color-text-muted;
    font-size: $fontSize-xs;
    font-weight: $fontWeight-bold;
    letter-spacing: $letterSpacing-caps;
    padding: $space-10 $space-14 $space-4;
    text-transform: uppercase;

    &:not(:first-child) {
        border-top: 1px solid $color-border;
        margin-top: $space-4;
        padding-top: $space-12;
    }
}

.itemDetailAddBack {
    color: $color-accent-text;
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
    padding: $space-6 $space-14;
}

.itemDetailAddOptionalLabel {
    align-items: center;
    color: $color-text-muted;
    cursor: pointer;
    display: flex;
    font-size: $fontSize-sm;
    gap: $space-6;
}

.lpOptionalToggle {
    cursor: pointer;
    height: 14px;
    width: 14px;
}

.itemDetailAddOption {
    align-items: center;
    cursor: pointer;
    display: flex;
    font-size: $fontSize-sm;
    gap: $space-12;
    justify-content: space-between;
    list-style: none;
    padding: $space-10 $space-14;

    &:hover {
        background: rgba(var(--color-accent-rgb), 0.06);
    }

    &.dimmed {
        color: $color-text-muted;
        cursor: default;
        pointer-events: none;
    }
}

// The arrow sits at the right edge of the row, so a long name wrapping never leaves it alone.
.itemDetailAddNext {
    color: $color-text-muted;
    flex-shrink: 0;
}

.itemDetailAddNewList {
    color: $color-accent-text;
    cursor: pointer;
    font-size: $fontSize-sm;
    font-weight: $fontWeight-bold;
    padding: $space-2 0;

    &:hover { opacity: 0.8; }
}

.itemDetailAddCreate {
    align-items: stretch;
    display: grid;
    gap: $space-6;
    grid-template-columns: minmax(0, 1fr);
    margin-top: 0;
    padding: $space-6 $space-10 $space-10;
}

.itemDetailAddCreateRow {
    display: grid;
    gap: $space-6;
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
    padding: 0 $space-10;

    &:focus {
        border-color: $color-accent;
        box-shadow: $shadow-focus-ring;
        outline: none;
    }
}

.itemDetailAddCreateBtn {
    min-height: $control-height-sm;
    white-space: nowrap;
}

@media (max-width: $bp-tablet-s) {
    .itemDetailAddCreateRow {
        grid-template-columns: minmax(0, 1fr);
    }
}
</style>
