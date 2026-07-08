<style lang="scss">
@import "../css/_item-image";
</style>

<template>
    <div>
        <modal id="itemImageDialog" :shown="shown" @hide="shown = false">
            <h2 class="itemImageTitle">{{ $t('item.imageDialogTitle') }}</h2>

            <div class="itemImageSections">
                <!-- Current image -->
                <div v-if="item && (item.image || item.imageUrl)" class="itemImageSection">
                    <div class="itemImageSectionLabel">{{ $t('item.imageSectionCurrent') }}</div>
                    <div class="itemImageCurrentWrap">
                        <img class="itemImageCurrentThumb" :src="currentThumb" alt="Current item image">
                        <span class="itemImageCurrentLabel">{{ $t('item.imageLabelAttached') }}</span>
                        <button class="lpButton lpSmall lpButtonDanger" @click="removeItemImage">{{ $t('item.imageButtonRemove') }}</button>
                    </div>
                </div>

                <!-- URL input -->
                <div class="itemImageSection">
                    <div class="itemImageSectionLabel">{{ $t('item.imageSectionUrl') }}</div>
                    <form class="itemImageUrlRow" @submit.prevent="saveImageUrl">
                        <input
                            v-model="imageUrl"
                            type="text"
                            class="itemImageUrlInput"
                            :placeholder="$t('item.imageUrlPlaceholder')"
                            autocomplete="off"
                        >
                        <button type="submit" class="lpButton lpSmall">{{ $t('item.imageButtonSave') }}</button>
                    </form>
                </div>

                <div class="itemImageDivider">{{ $t('item.imageOrDivider') }}</div>

                <!-- Upload -->
                <div class="itemImageSection">
                    <div class="itemImageSectionLabel">{{ $t('item.imageSectionUpload') }}</div>
                    <div
                        class="itemImageDropZone"
                        :class="{ dragover: isDragOver }"
                        @click="triggerImageUpload"
                        @dragover.prevent="isDragOver = true"
                        @dragleave="isDragOver = false"
                        @drop.prevent="onDrop"
                    >
                        <span class="itemImageDropIcon">📎</span>
                        <span class="itemImageDropText">{{ $t('item.imageDropText') }}</span>
                        <span class="itemImageDropHint">{{ $t('item.imageDropHint') }}</span>
                    </div>
                    <p v-if="uploading" class="itemImageStatus">{{ $t('item.imageUploading') }}</p>
                    <p class="itemImageNotice">
                        {{ $t('item.imageNotice') }}
                    </p>
                </div>
            </div>

            <div class="itemImageFooter">
                <a class="itemImageCancel" @click="shown = false">{{ $t('item.imageButtonCancel') }}</a>
            </div>
        </modal>

        <form ref="imageUploadForm" style="display:none">
            <input id="image" ref="imageInput" type="file" name="image" accept="image/png,image/jpeg,image/gif" @change="uploadImage">
        </form>
    </div>
</template>

<script>
import modal from './modal.vue';
import { registerDialogOpener, unregisterDialogOpener } from '../services/dialogs';
import { showGlobalAlert } from '../services/user-feedback';
import { fetchJson } from '../utils/utils';

export default {
    name: 'ItemImage',
    components: { modal },
    data() {
        return {
            imageUrl: null,
            item: false,
            uploading: false,
            isDragOver: false,
            shown: false,
        };
    },
    computed: {
        currentThumb() {
            if (!this.item) return '';
            if (this.item.image) return `https://i.imgur.com/${this.item.image}s.jpg`;
            return this.item.imageUrl || '';
        },
    },
    mounted() {
        registerDialogOpener('itemImage', (item) => {
            this.shown = true;
            this.item = item;
            this.imageUrl = item.imageUrl || '';
        });
    },
    beforeUnmount() {
        unregisterDialogOpener('itemImage');
    },
    methods: {
        saveImageUrl() {
            this.$store.commit('updateItemImageUrl', { imageUrl: this.imageUrl, item: this.item });
            this.shown = false;
        },
        triggerImageUpload() {
            this.$refs.imageInput.click();
        },
        onDrop(evt) {
            this.isDragOver = false;
            const file = evt.dataTransfer.files[0];
            if (file) this.processFile(file);
        },
        uploadImage(evt) {
            const file = evt.target.files[0];
            if (file) this.processFile(file);
        },
        processFile(file) {
            if (!FormData) {
                showGlobalAlert(this.$t('item.imageErrorBrowser'));
                return;
            }
            if (file.size > 2500000) {
                showGlobalAlert(this.$t('item.imageErrorSize'));
                return;
            }
            if (!['image/png', 'image/jpg', 'image/jpeg', 'image/gif'].includes(file.type)) {
                showGlobalAlert(this.$t('item.imageErrorType'));
                return;
            }
            const formData = new FormData();
            formData.append('image', file);
            this.uploading = true;
            return fetchJson('/imageUpload', {
                method: 'POST',
                body: formData,
                credentials: 'same-origin',
            })
                .then((response) => {
                    this.uploading = false;
                    this.$store.commit('updateItemImage', { image: response.data.id, item: this.item });
                    this.shown = false;
                })
                .catch(() => {
                    this.uploading = false;
                    showGlobalAlert(this.$t('item.imageErrorUpload'));
                });
        },
        removeItemImage() {
            this.$store.commit('removeItemImage', this.item);
            this.item.image = '';
        },
    },
};
</script>
