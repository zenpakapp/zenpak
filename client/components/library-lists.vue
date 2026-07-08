<style lang="scss">
@import "../css/_globals";

#listContainer {
    flex: 0 0 auto;
    margin-bottom: 20px;

    #lists {
        max-height: 111px;
        overflow-y: auto;
    }
}

.lpLibraryList {
    border-top: 1px solid $color-border;
    color: $color-text;
    display: flex;
    list-style: none;
    margin: 0 10px;
    overflow-y: auto;
    padding: 8px 10px;
    position: relative;
    transition: background $transitionDurationFast ease, color $transitionDurationFast ease;

    &:first-child {
        border-top: none;
        padding-top: 10px;
    }

    &:last-child {
        border-bottom: none;
    }

    &.lpActive {
        background: rgba(var(--color-accent-rgb), 0.08);
        color: $color-accent;
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
        margin-right: 5px;
    }

    &:hover .lpHandle {
        visibility: visible;
    }

    &:hover {
        background: rgba(var(--color-accent-rgb), 0.04);
    }

    .lpListName {
        flex: 1 1 auto;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;

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
    margin-bottom: 10px;
}

#addListFlyout {
    .lpContent a {
        display: block;
        margin-bottom: 5px;

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
            <PopoverHover id="addListFlyout" placement="right">
                <template #target><span><a class="lpAdd" @click="newList"><i class="lpSprite lpSpriteAdd" />{{ $t('library.addNewList') }}</a></span></template>
                <template #content><div style="display:flex;flex-direction:column;gap:8px;">
                    <a class="lpAdd" @click="newList"><i class="lpSprite lpSpriteAdd" />{{ $t('library.addNewList') }}</a>
                    <a class="lpAdd" @click="importText"><i class="lpSprite lpSpriteUpload" />{{ $t('library.pasteGearList') }}</a>
                    <a class="lpAdd" @click="importCSV"><i class="lpSprite lpSpriteUpload" />{{ $t('library.importCSV') }}</a>
                    <a class="lpAdd" @click="importLP"><i class="lpSprite lpSpriteUpload" />{{ $t('library.importFromLighterpack') }}</a>
                    <a class="lpCopy" @click="copyList"><i class="lpSprite lpSpriteCopy" />{{ $t('library.copyList') }}</a>
                </div></template>
            </PopoverHover>
        </div>
        <ul id="lists" ref="lists">
            <li v-for="list in library.lists" :key="list.id" class="lpLibraryList" :class="{lpActive: (library.defaultListId == list.id)}">
                <div class="lpHandle" :title="$t('library.reorderItemTitle')" />
                <span class="lpLibraryListSwitch lpListName" @click="setDefaultList(list)">
                    {{ listName(list) }}
                </span>
                <a class="lpRemove" :title="$t('library.removeListTitle')" @click="removeList(list)"><i class="lpSprite lpSpriteRemove" /></a>
            </li>
        </ul>
    </section>
</template>

<script>
import PopoverHover from './popover-hover.vue';
import { openDialog } from '../services/dialogs';
import { openSpeedbump } from '../services/speedbump';
import { getElementIndex } from '../utils/utils';
import { createDragDrop } from '../services/drag-drop';

export default {
    name: 'LibraryList',
    components: {
        PopoverHover,
    },
    props: ['list'],
    computed: {
        library() {
            return this.$store.state.library;
        },
    },
    data() {
        return {
            dragStartIndex: null,
            drake: null,
        };
    },
    mounted() {
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
        newList() {
            this.$store.commit('newList');
        },
        copyList() {
            openDialog('copyList');
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
        handleListReorder() {
            if (this.drake) {
                this.drake.destroy();
            }

            const drake = createDragDrop([this.$refs.lists], {
                moves($el, $source, $handle, $sibling) {
                    return $handle.classList.contains('lpHandle');
                },
            });
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
            const callback = () => {
                this.$store.commit('removeList', list);
            };
            const speedbumpOptions = {
                body: this.$t('library.deleteListConfirm'),
            };
            openSpeedbump(callback, speedbumpOptions);
        },
    },
};
</script>
