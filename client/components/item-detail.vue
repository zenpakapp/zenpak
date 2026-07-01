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
}

.itemDetail {
    display: flex;
    flex-direction: column;
}
</style>

<template>
    <modal id="itemDetailDialog" :shown="shown" @hide="close">
        <div class="itemDetail">
            <!-- View mode -->
            <item-detail-view
                v-if="!editing"
                :item="item"
                :category-item="categoryItem"
                :category="category"
                @close="close"
                @start-edit="startEdit"
            />

            <!-- Edit mode -->
            <item-detail-edit
                v-else
                :item="item"
                :category-item="categoryItem"
                :category="category"
                @close="close"
                @saved="onSaved"
            />
        </div>
    </modal>
</template>

<script>
import modal from './modal.vue';
import ItemDetailView from './item-detail-view.vue';
import ItemDetailEdit from './item-detail-edit.vue';
import { registerDialogOpener, unregisterDialogOpener } from '../services/dialogs';

export default {
    name: 'ItemDetail',
    components: { modal, ItemDetailView, ItemDetailEdit },
    data() {
        return {
            shown: false,
            editing: false,
            item: {},
            categoryItem: null,
            category: null,
        };
    },
    mounted() {
        registerDialogOpener('itemDetail', ({ item, categoryItem, category, startEditing }) => {
            this.item = { ...item };
            const liveCategory = category ? this.$store.state.library.getCategoryById(category.id) : null;
            const liveCategoryItem = liveCategory && item ? liveCategory.getCategoryItemById(item.id) : null;
            this.categoryItem = liveCategoryItem ? { ...liveCategoryItem } : (categoryItem ? { ...categoryItem } : null);
            this.category = liveCategory || category || null;
            this.shown = true;
            if (startEditing) {
                this.startEdit();
            } else {
                this.editing = false;
            }
        });
    },
    beforeUnmount() {
        unregisterDialogOpener('itemDetail');
    },
    methods: {
        close() {
            this.shown = false;
            this.editing = false;
        },
        startEdit() {
            this.editing = true;
        },
        onSaved({ item, categoryItem }) {
            this.item = { ...item };
            if (categoryItem) this.categoryItem = { ...categoryItem };
            this.editing = false;
        },
    },
};
</script>
