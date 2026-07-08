<style lang="scss">
@import "../css/_globals";

#itemLinkForm {
    display: flex;
    flex-direction: column;
    gap: 16px;
}
</style>

<template>
    <modal id="itemLinkDialog" :shown="shown" @hide="shown = false">
        <h2>{{ $t('item.linkDialogTitle') }}</h2>
        <form id="itemLinkForm" @submit.prevent="addLink">
            <div class="lpModalBody">
                <div>
                    <label for="itemLink">{{ $t('item.linkLabelUrl') }}</label>
                    <input id="itemLink" v-model="url" type="text" :placeholder="$t('item.linkPlaceholder')">
                </div>
            </div>
            <div class="lpModalActions">
                <a class="lpHref close" @click="shown = false">{{ $t('item.linkButtonCancel') }}</a>
                <input type="submit" class="lpButton" :value="$t('item.linkButtonSave')">
            </div>
        </form>
    </modal>
</template>

<script>
import modal from './modal.vue';
import { registerDialogOpener, unregisterDialogOpener } from '../services/dialogs';

export default {
    name: 'ItemLink',
    components: {
        modal,
    },
    data() {
        return {
            url: '',
            item: false,
            shown: false,
        };
    },
    mounted() {
        registerDialogOpener('itemLink', (item) => {
            this.shown = true;
            this.item = item;
            this.url = item.url;
        });
    },
    beforeUnmount() {
        unregisterDialogOpener('itemLink');
    },
    methods: {
        addLink() {
            this.$store.commit('updateItemLink', { url: this.url, item: this.item });
            this.shown = false;
        },
    },
};
</script>
