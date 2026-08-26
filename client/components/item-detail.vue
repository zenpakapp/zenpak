<template>
    <modal id="itemDetailDialog" :shown="shown" @hide="close">
        <div class="itemDetail">
            <item-detail-view
                v-if="!editing"
                :item="item"
                :category-item="activeCategoryItem"
                :category="category"
                @close="close"
                @start-edit="startEdit"
                @duplicate="duplicateItem"
            />

            <item-detail-edit
                v-else
                :item="item"
                :category-item="activeCategoryItem"
                :category="category"
                :initial-focus="initialFocus"
                @close="close"
                @saved="onSaved"
            />
        </div>
    </modal>
</template>

<script>
import { defineAsyncComponent } from 'vue';
import modal from './modal.vue';
import ItemDetailView from './item-detail-view.vue';
import { registerDialogOpener, unregisterDialogOpener } from '../services/dialogs';

const ItemDetailEdit = defineAsyncComponent(() => import(/* webpackChunkName: "dialog-item-detail-edit" */ './item-detail-edit.vue'));

export default {
    name: 'ItemDetail',
    components: { modal, ItemDetailView, ItemDetailEdit },
    data() {
        return {
            shown: false,
            editing: false,
            item: null,
            categoryItem: null,
            category: null,
            discardOnCancel: false,
            initialFocus: 'name',
            closeAfterSave: false,
        };
    },
    computed: {
        activeCategoryItem() {
            if (!this.category || !this.item) return this.categoryItem;
            return this.category.getCategoryItemById(this.item.id) || this.categoryItem;
        },
    },
    mounted() {
        registerDialogOpener('itemDetail', ({
            item,
            categoryItem,
            category,
            startEditing,
            discardOnCancel,
            initialFocus,
        }) => {
            const library = this.$store.state.library;
            let liveCategory = category ? library.getCategoryById(category.id) : null;
            if (!liveCategory && item) {
                liveCategory = library.findCategoryWithItemById(item.id, library.defaultListId);
            }
            const liveCategoryItem = liveCategory && item ? liveCategory.getCategoryItemById(item.id) : null;
            this.item = { ...item };
            if (liveCategoryItem) {
                this.categoryItem = { ...liveCategoryItem };
            } else if (categoryItem) {
                this.categoryItem = { ...categoryItem };
            } else {
                this.categoryItem = null;
            }
            this.category = liveCategory || category || null;
            this.discardOnCancel = !!discardOnCancel;
            this.initialFocus = initialFocus || 'name';
            this.closeAfterSave = !!startEditing;
            this.shown = true;
            this.editing = !!startEditing;
        });
    },
    beforeUnmount() {
        unregisterDialogOpener('itemDetail');
    },
    methods: {
        close() {
            if (this.discardOnCancel && this.item) {
                const liveItem = this.$store.state.library.getItemById(this.item.id);
                if (liveItem) this.$store.commit('removeItem', liveItem);
            }
            this.discardOnCancel = false;
            this.closeAfterSave = false;
            this.shown = false;
            this.editing = false;
        },
        startEdit() {
            this.closeAfterSave = false;
            this.editing = true;
        },
        onSaved({ item, categoryItem }) {
            this.discardOnCancel = false;
            this.item = { ...item };
            const liveCategoryItem = this.category && item ? this.category.getCategoryItemById(item.id) : null;
            if (liveCategoryItem) {
                this.categoryItem = { ...liveCategoryItem };
            } else if (categoryItem) {
                this.categoryItem = { ...categoryItem };
            }
            if (this.closeAfterSave) {
                this.closeAfterSave = false;
                this.shown = false;
                this.editing = false;
                return;
            }
            this.editing = false;
        },
        duplicateItem() {
            this.$store.commit('duplicateItem', this.item);
            const library = this.$store.state.library;
            const copy = library.items[library.items.length - 1];
            this.item = { ...copy };
            this.categoryItem = null;
            this.category = null;
            this.editing = true;
        },
    },
};
</script>

<style lang="scss">
@import "../css/_globals";

#itemDetailDialog.lpModal {
    border-radius: $radius-md;
    max-height: 90vh;
    overflow-y: auto;
    padding: 0;
    width: min(480px, 92vw);

    &::before {
        display: none;
    }

    .lpModalClose {
        top: 20px;
    }
}

.itemDetail {
    display: flex;
    flex-direction: column;
}
</style>
