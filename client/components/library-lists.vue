<style lang="scss">
@import "../css/_globals";

#listContainer {
    flex: 0 0 auto;
    margin-bottom: $space-20;

    #lists {
        max-height: 150px;
        overflow-y: auto;
    }
}

.lpLibraryList {
    border-top: 1px solid $color-border;
    color: $color-text;
    display: flex;
    list-style: none;
    margin: 0 $space-10;
    overflow-y: auto;
    padding: $space-8 $space-10;
    position: relative;
    transition: background $transitionDurationFast ease, color $transitionDurationFast ease;

    &:first-child {
        border-top: none;
        padding-top: $space-10;
    }

    &:last-child {
        border-bottom: none;
    }

    &.lpActive {
        background: rgba(var(--color-accent-rgb), 0.08);
        color: $color-accent-text;
        font-weight: $fontWeight-bold;

        .lpRemove {
            display: none;
        }
    }

    &.gu-mirror {
        background: $color-bg;
        border: 1px solid $color-border;
        color: $color-text;
    }

    .lpHandle {
        flex: 0 0 12px;
        height: 18px;
        margin-right: $space-6;
    }

    &:hover .lpHandle {
        visibility: visible;
    }

    &:hover {
        background: rgba(var(--color-accent-rgb), 0.04);
    }

    // A long name takes two lines instead of one cut-off line; the full name is the tooltip.
    .lpListName {
        -webkit-box-orient: vertical;
        display: -webkit-box;
        flex: 1 1 auto;
        -webkit-line-clamp: 2;
        line-clamp: 2;
        overflow: hidden;
        overflow-wrap: anywhere;

        &:hover {
            cursor: pointer;
            text-decoration: underline;
        }
    }

    .lpRemove {
        flex: 0 0 8px;
        margin-bottom: 0;
    }
}

.listContainerHeader {
    align-items: center;
    display: flex;
    justify-content: space-between;
    margin-bottom: $space-10;
}

#addListFlyout {
    .lpContent a {
        display: block;
        margin-bottom: $space-6;

        &:last-child {
            margin-bottom: 0;
        }
    }
}
</style>

<template>
    <section id="listContainer">
        <div class="listContainerHeader">
            <h2>{{ $t('library.listsTitle') }}</h2>
            <!-- Hover opens the menu with a mouse. On touch there is no hover: a tap opens it instead. -->
            <PopoverHover id="addListFlyout" ref="addMenu" placement="right" :trigger="touchMenu ? 'click' : 'hover'">
                <template #target>
                    <span><a class="lpAdd" role="button" tabindex="0" :aria-haspopup="touchMenu ? 'menu' : null" @click="onAddListClick" @keydown.enter="onAddListClick" @keydown.space.prevent="onAddListClick"><i class="lpGlyph"><icon name="plus" :size="14" /></i>{{ $t('library.addNewList') }}</a></span>
                </template>
                <template #content>
                    <div style="display: flex; flex-direction: column; gap: 8px;" @click="closeAddMenu">
                        <a class="lpAdd" role="button" tabindex="0" @click="newList" @keydown.enter="newList" @keydown.space.prevent="newList"><i class="lpGlyph"><icon name="plus" :size="14" /></i>{{ $t('library.addBlankList') }}</a>
                        <a class="lpAdd" role="button" tabindex="0" @click="showTemplatePicker = true" @keydown.enter="showTemplatePicker = true" @keydown.space.prevent="showTemplatePicker = true"><i class="lpGlyph"><icon name="plus" :size="14" /></i>{{ $t('library.addListFromTemplate') }}</a>
                        <a class="lpAdd" role="button" tabindex="0" @click="importText" @keydown.enter="importText" @keydown.space.prevent="importText"><i class="lpGlyph"><icon name="upload" :size="14" /></i>{{ $t('library.pasteGearList') }}</a>
                        <a class="lpAdd" role="button" tabindex="0" @click="importCSV" @keydown.enter="importCSV" @keydown.space.prevent="importCSV"><i class="lpGlyph"><icon name="upload" :size="14" /></i>{{ $t('library.importCSV') }}</a>
                        <a class="lpAdd" role="button" tabindex="0" @click="importLP" @keydown.enter="importLP" @keydown.space.prevent="importLP"><i class="lpGlyph"><icon name="upload" :size="14" /></i>{{ $t('library.importFromLighterpack') }}</a>
                        <a class="lpCopy" role="button" tabindex="0" @click="copyList" @keydown.enter="copyList" @keydown.space.prevent="copyList"><i class="lpGlyph"><icon name="copy" :size="14" /></i>{{ $t('library.copyList') }}</a>
                    </div>
                </template>
            </PopoverHover>
        </div>
        <ul id="lists" ref="lists">
            <li v-for="list in library.lists" :key="list.id" class="lpLibraryList" :class="{lpActive: (library.defaultListId == list.id)}">
                <div class="lpHandle" :title="$t('library.reorderItemTitle')" />
                <span class="lpLibraryListSwitch lpListName" role="button" tabindex="0" :aria-current="library.defaultListId == list.id ? 'true' : null" :title="listName(list)" @click="setDefaultList(list)" @keydown.enter="setDefaultList(list)" @keydown.space.prevent="setDefaultList(list)">
                    {{ listName(list) }}
                    <span v-if="forkUpdateFor(list)" class="lpForkUpdateBadge">{{ $t('list.versioning.updateBadge', { version: forkUpdateFor(list).latestVersion }) }}</span>
                </span>
                <a class="lpRemove" role="button" tabindex="0" :title="$t('library.removeListTitle')" @click="removeList(list)" @keydown.enter="removeList(list)" @keydown.space.prevent="removeList(list)"><icon name="x" :size="12" /></a>
            </li>
        </ul>
        <templatePicker v-if="showTemplatePicker" mode="add" @add="addFromTemplate" @dismiss="showTemplatePicker = false" />
    </section>
</template>

<script>
import { defineAsyncComponent } from 'vue';
import PopoverHover from './popover-hover.vue';
import Icon from './icon.vue';
import { templateToListImport } from '../composables/useTemplatePicker';
import { openDialog } from '../services/dialogs';
import { openSpeedbump } from '../services/speedbump';
import { getElementIndex } from '../utils/utils';
import { createDragDrop } from '../services/drag-drop';
import { findForkUpdate } from '../utils/fork-updates';

const templatePicker = defineAsyncComponent(() => import(/* webpackChunkName: "template-picker" */ './template-picker.vue'));

export default {
    name: 'LibraryList',
    components: {
        PopoverHover,
        templatePicker,
        Icon,
    },
    inject: {
        forkUpdates: { from: 'forkUpdates', default: () => [] },
    },
    props: ['list'],
    data() {
        return {
            dragStartIndex: null,
            drake: null,
            showTemplatePicker: false,
            touchMenu: false,
        };
    },
    computed: {
        library() {
            return this.$store.state.library;
        },
    },
    mounted() {
        this.touchMenu = typeof window.matchMedia === 'function'
            && window.matchMedia('(hover: none), (pointer: coarse)').matches;
        this.handleListReorder();
    },
    beforeUnmount() {
        if (this.drake) {
            this.drake.destroy();
            this.drake = null;
        }
    },
    methods: {
        setDefaultList(list) {
            this.$store.commit('setDefaultList', list);
        },
        listName(list) {
            return list.name || this.$t('library.newListDefault');
        },
        forkUpdateFor(list) {
            return findForkUpdate(list, this.forkUpdates);
        },
        newList() {
            this.$store.commit('newList');
        },
        // The label never creates a list by itself: it opens the menu, whose first entry is the blank
        // list. With a mouse the menu is already open on hover; on touch the popover toggles on click.
        onAddListClick() {
            if (!this.touchMenu && this.$refs.addMenu) this.$refs.addMenu.show();
        },
        closeAddMenu() {
            if (this.touchMenu && this.$refs.addMenu) this.$refs.addMenu.hide();
        },
        copyList() {
            openDialog('copyList');
        },
        addFromTemplate(template, { listName, templateName }) {
            this.$store.commit('importPublicList', templateToListImport(template, listName, templateName));
            this.showTemplatePicker = false;
        },
        importText() {
            openDialog('importText');
        },
        importCSV() {
            openDialog('importCSV');
        },
        importLP() {
            openDialog('importLP');
        },
        async handleListReorder() {
            if (this.drake) {
                this.drake.destroy();
            }

            const drake = await createDragDrop([this.$refs.lists], {
                moves($el, $source, $handle, $sibling) {
                    return $handle.classList.contains('lpHandle');
                },
            });
            if (!this.$el) {
                drake.destroy();
                return;
            }
            drake.on('drag', ($el, $target, $source, $sibling) => {
                this.dragStartIndex = getElementIndex($el);
            });
            drake.on('drop', ($el, $target, $source, $sibling) => {
                this.$store.commit('reorderList', { before: this.dragStartIndex, after: getElementIndex($el) });
                drake.cancel(true);
            });
            this.drake = drake;
        },
        removeList(list) {
            const callback = (confirmed, { checked } = {}) => {
                this.$store.commit('removeList', { list, removeUnusedItems: Boolean(checked) });
            };
            const speedbumpOptions = {
                body: this.$t('library.deleteListConfirm'),
                checkbox: this.$t('library.deleteListItemsToo'),
            };
            openSpeedbump(callback, speedbumpOptions);
        },
    },
};
</script>
