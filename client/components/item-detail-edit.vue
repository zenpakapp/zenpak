<style lang="scss" scoped>
@import "../css/_globals";

/* Edit mode */
.itemDetailEditForm {
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 20px;

    .itemDetailField {
        display: flex;
        flex-direction: column;
        gap: 4px;

        label {
            color: $color-text-muted;
            font-size: $fontSize-sm;
            font-weight: $fontWeight-medium;
            letter-spacing: $letterSpacing-caps;
            text-transform: uppercase;
        }

        .itemDetailSelectWrap {
            position: relative;

            &::after {
                color: $color-text-muted;
                content: "⌄";
                font-size: 18px;
                line-height: 1;
                pointer-events: none;
                position: absolute;
                right: 10px;
                top: 50%;
                transform: translateY(-54%);
            }

            select {
                appearance: none;
                padding-right: 30px;
                width: 100%;
            }

            &.itemDetailSelectUnit {
                flex: 0 0 64px;

                select { flex: none; }
            }
        }

        input[type="text"],
        input[type="number"],
        select,
        textarea {
            border: 1px solid $color-border;
            border-radius: $radius-sm;
            font-size: $fontSize-base;
            padding: 7px 10px;
            width: 100%;

            &:focus {
                border-color: $color-accent;
                outline: none;
            }
        }

        textarea {
            min-height: 64px;
            resize: vertical;
        }
    }

    .itemDetailFieldRow {
        display: grid;
        gap: 12px;
        grid-template-columns: 1fr 1fr 1fr;
    }

    .itemDetailUnitRow {
        display: flex;
        gap: 8px;

        input {
            flex: 1;
        }
    }

    .itemDetailTagsEdit {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-bottom: 6px;

        .itemDetailTagChip {
            align-items: center;
            background: $color-surface;
            border: 1px solid $color-border;
            border-radius: 99px;
            display: flex;
            font-size: $fontSize-sm;
            gap: 4px;
            padding: 2px 8px;

            button {
                background: none;
                border: none;
                color: $color-text-muted;
                cursor: pointer;
                font-size: 14px;
                line-height: 1;
                padding: 0;

                &:hover { color: $color-text; }
            }
        }
    }

    .itemDetailTagInput {
        display: flex;
        gap: 6px;

        input { flex: 1; }
    }

    .itemDetailUrlRow {
        display: flex;
        gap: 6px;

        input { flex: 1; }
    }

    .itemDetailFetchBtn {
        white-space: nowrap;

        &:disabled { cursor: default; opacity: 0.5; }
    }

    .itemDetailFetchError {
        color: $color-danger;
        font-size: $fontSize-sm;
        margin-top: 4px;
    }

    .itemDetailFetchSuccess {
        color: $color-accent;
        font-size: $fontSize-sm;
        margin-top: 4px;
    }

    .itemDetailFieldOptional {
        color: $color-text-muted;
        font-size: $fontSize-sm;
        font-weight: $fontWeight-normal;
    }

    .itemDetailDropZone {
        align-items: center;
        border: 2px dashed $color-border;
        border-radius: $radius-md;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        gap: 6px;
        justify-content: center;
        min-height: 120px;
        padding: 20px;
        position: relative;
        transition: border-color $transitionDurationFast ease, background $transitionDurationFast ease;

        &:hover,
        &.itemDetailDropZoneActive {
            background: rgba(var(--color-accent-rgb), 0.05);
            border-color: $color-accent;
        }

        &.itemDetailDropZoneHasImage {
            border-style: solid;
            min-height: auto;
            padding: 0;
        }
    }

    .itemDetailDropZoneIcon {
        color: $color-text-muted;
        height: 32px;
        width: 32px;
    }

    .itemDetailDropZoneText {
        color: $color-text-muted;
        font-size: $fontSize-sm;
        text-align: center;

        strong {
            color: $color-accent;
        }
    }

    .itemDetailDropZoneHint {
        color: $color-text-muted;
        font-size: $fontSize-xs;
    }

    .itemDetailDropZoneUploading {
        color: $color-text-muted;
        font-size: $fontSize-sm;
    }

    .itemDetailDropZonePreview {
        border-radius: $radius-md;
        display: block;
        max-height: 200px;
        object-fit: contain;
        width: 100%;
    }

    .itemDetailDropZoneRemove {
        background: $color-bg;
        border: 1px solid $color-border;
        border-radius: 999px;
        color: $color-text;
        cursor: pointer;
        font-size: 16px;
        height: 28px;
        line-height: 1;
        padding: 0;
        position: absolute;
        right: 8px;
        top: 8px;
        width: 28px;

        &:hover {
            background: $color-danger;
            border-color: $color-danger;
            color: #fff;
        }
    }
}

.itemDetailEditFooter {
    align-items: center;
    border-top: 1px solid $color-border;
    display: flex;
    gap: 8px;
    justify-content: flex-end;
    padding: 14px 20px;
}
</style>

<template>
    <div>
        <item-detail-header
            :name="editName || 'Unnamed item'"
            :brand="editBrand || ''"
            :category="editCategory || ''"
            :image-key="item.image || ''"
            :image-url="item.imageUrl || ''"
            :starred="localStarred"
            @toggle-star="toggleStar"
            @close="$emit('close')"
            @view-image="viewImage"
        />

        <!-- Edit form -->
        <form class="itemDetailEditForm" @submit.prevent="saveEdit">
            <div class="itemDetailField">
                <label>Name</label>
                <input v-model="editName" type="text" placeholder="Item name" autofocus>
            </div>

            <div class="itemDetailField">
                <label>Description</label>
                <textarea v-model="editDescription" placeholder="Description"></textarea>
            </div>

            <div class="itemDetailField">
                <label>Brand</label>
                <item-brand-input v-model="editBrand" />
            </div>

            <div class="itemDetailField">
                <label>Type</label>
                <div class="itemDetailSelectWrap">
                    <select v-model="editCategory">
                        <option value="">— none —</option>
                        <option v-for="cat in gearCategories" :key="cat" :value="cat">{{ cat }}</option>
                    </select>
                </div>
            </div>

            <div class="itemDetailFieldRow">
                <div class="itemDetailField">
                    <label>Weight</label>
                    <div class="itemDetailUnitRow">
                        <input v-model="editWeight" type="text" placeholder="0">
                        <div class="itemDetailSelectWrap itemDetailSelectUnit">
                            <select v-model="editUnit">
                                <option v-for="u in units" :key="u" :value="u">{{ u }}</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div class="itemDetailField">
                    <label>Price</label>
                    <input v-model="editPrice" type="text" placeholder="0.00">
                </div>
                <div class="itemDetailField">
                    <label>Qty</label>
                    <input v-model="editQty" type="text" placeholder="1">
                </div>
            </div>

            <div class="itemDetailField">
                <label>Purchase URL</label>
                <div class="itemDetailUrlRow">
                    <input v-model="editUrl" type="text" placeholder="https://…" @keydown.enter.prevent="fetchGear">
                    <button type="button" class="lpButton lpSmall lpButtonSecondary itemDetailFetchBtn" :disabled="fetchLoading || !editUrl" @click="fetchGear">
                        {{ fetchLoading ? '…' : '⬇ Fetch' }}
                    </button>
                </div>
                <span v-if="fetchError" class="itemDetailFetchError">{{ fetchError }}</span>
                <span v-if="fetchSuccess" class="itemDetailFetchSuccess">{{ fetchSuccess }}</span>
            </div>

            <div class="itemDetailField">
                <label>Image <span class="itemDetailFieldOptional">(optional)</span></label>
                <div
                    class="itemDetailDropZone"
                    :class="{ 'itemDetailDropZoneActive': imageDragOver, 'itemDetailDropZoneHasImage': editImageUrl || editImageUploading }"
                    @dragover.prevent="imageDragOver = true"
                    @dragleave="imageDragOver = false"
                    @drop.prevent="onImageDrop"
                    @click="$refs.imageFileInput.click()"
                >
                    <input ref="imageFileInput" type="file" accept="image/png,image/jpeg,image/gif,image/webp" style="display:none" @change="onImageFileChange">
                    <template v-if="editImageUploading">
                        <span class="itemDetailDropZoneUploading">Uploading…</span>
                    </template>
                    <template v-else-if="editImageUrl">
                        <img :src="editImageUrl" class="itemDetailDropZonePreview">
                        <button type="button" class="itemDetailDropZoneRemove" @click.stop="editImageUrl = ''">×</button>
                    </template>
                    <template v-else>
                        <svg class="itemDetailDropZoneIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <rect x="3" y="3" width="18" height="18" rx="2"/>
                            <circle cx="8.5" cy="8.5" r="1.5"/>
                            <path d="m21 15-5-5L5 21"/>
                        </svg>
                        <span class="itemDetailDropZoneText">Drop an image here, or <strong>click to browse</strong></span>
                        <span class="itemDetailDropZoneHint">PNG, JPG up to 5MB</span>
                    </template>
                </div>
                <span v-if="imageUploadError" class="itemDetailFetchError">{{ imageUploadError }}</span>
            </div>

            <div class="itemDetailField">
                <label>Tags</label>
                <div class="itemDetailTagsEdit">
                    <span v-for="tag in editTags" :key="tag" class="itemDetailTagChip">
                        {{ tag }}
                        <button type="button" class="lpIconButton itemDetailTagRemove" @click="removeTag(tag)">×</button>
                    </span>
                </div>
                <div class="itemDetailTagInput">
                    <input v-model="tagInput" type="text" placeholder="Add a tag…" @keydown.enter.prevent="addTag">
                    <button type="button" class="lpButton lpSmall lpButtonSecondary" @click="addTag">Add</button>
                </div>
            </div>
        </form>

        <div class="itemDetailEditFooter">
            <a class="lpHref close" @click="$emit('close')">Cancel</a>
            <button class="lpButton" @click="saveEdit">Save</button>
        </div>
    </div>
</template>

<script>
import ItemDetailHeader from './item-detail-header.vue';
import ItemBrandInput from './item-brand-input.vue';
import { openDialog } from '../services/dialogs';

const weightUtils = require('../utils/weight.js');

const GEAR_CATEGORIES = [
    'Pack & Bags', 'Shelter', 'Sleep', 'Clothing', 'Water', 'Food', 'Cook',
    'Navigation', 'Safety', 'Hygiene', 'Electronics', 'Essentials', 'Other',
];

const UNITS = ['oz', 'lb', 'g', 'kg'];

export default {
    name: 'ItemDetailEdit',
    components: { ItemDetailHeader, ItemBrandInput },
    props: {
        item: { type: Object, required: true },
        categoryItem: { type: Object, default: null },
        category: { type: Object, default: null },
    },
    emits: ['close', 'saved'],
    data() {
        return {
            localStarred: false,
            editName: '',
            editDescription: '',
            editBrand: '',
            editCategory: '',
            editWeight: '0',
            editUnit: 'g',
            editPrice: '0.00',
            editQty: 1,
            editUrl: '',
            editImageUrl: '',
            editImageUploading: false,
            imageUploadError: '',
            imageDragOver: false,
            editTags: [],
            tagInput: '',
            fetchLoading: false,
            fetchError: '',
            fetchSuccess: '',
        };
    },
    computed: {
        gearCategories() { return GEAR_CATEGORIES; },
        units() { return UNITS; },
        thumbnailImage() {
            if (this.editImageUrl) return this.editImageUrl;
            if (this.item.image) return `https://i.imgur.com/${this.item.image}l.jpg`;
            return this.item.imageUrl || null;
        },
    },
    watch: {
        'item.starred'(val) { this.localStarred = !!val; },
    },
    created() {
        this.localStarred = !!this.item?.starred;
        this.editName = this.item.name || '';
        this.editDescription = this.item.description || '';
        this.editBrand = this.item.brand || '';
        this.editCategory = this.item.category || '';
        this.editWeight = weightUtils.MgToWeight(this.item.weight, this.item.authorUnit);
        this.editUnit = this.item.authorUnit || 'g';
        this.editPrice = this.item.price != null ? this.item.price.toFixed(2) : '0.00';
        this.editQty = this.categoryItem ? this.categoryItem.qty : 1;
        this.editUrl = this.item.url || '';
        this.editImageUrl = this.item.imageUrl || '';
        this.editTags = [...(this.item.tags || [])];
    },
    methods: {
        toggleStar() {
            const starred = !this.localStarred;
            this.$store.commit('updateItem', { ...this.item, starred });
            this.localStarred = starred;
        },
        viewImage() {
            openDialog('itemViewImage', this.thumbnailImage);
        },
        saveEdit() {
            const weightFloat = parseFloat(this.editWeight) || 0;
            const updatedItem = {
                ...this.item,
                name: this.editName.trim(),
                description: this.editDescription.trim(),
                brand: this.editBrand.trim(),
                category: this.editCategory,
                url: this.editUrl.trim(),
                imageUrl: this.editImageUrl.trim() || undefined,
                tags: [...this.editTags],
                authorUnit: this.editUnit,
                weight: weightUtils.WeightToMg(weightFloat, this.editUnit),
                price: Math.round((parseFloat(this.editPrice) || 0) * 100) / 100,
            };
            this.$store.commit('updateItem', updatedItem);

            let updatedCategoryItem = this.categoryItem;
            if (this.categoryItem && this.category) {
                updatedCategoryItem = { ...this.categoryItem, qty: parseFloat(this.editQty) || 1 };
                this.$store.commit('updateCategoryItem', {
                    category: this.category,
                    categoryItem: updatedCategoryItem,
                });
            }
            this.$emit('saved', { item: updatedItem, categoryItem: updatedCategoryItem });
        },
        async fetchGear() {
            if (!this.editUrl || this.fetchLoading) return;
            this.fetchLoading = true;
            this.fetchError = '';
            this.fetchSuccess = '';
            try {
                const res = await fetch('/scrapeGear', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: this.editUrl }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'fetch failed');

                const filled = [];
                if (data.name && !this.editName) { this.editName = data.name; filled.push('name'); }
                if (data.brand && !this.editBrand) { this.editBrand = data.brand; filled.push('brand'); }
                if (data.price != null && !parseFloat(this.editPrice)) { this.editPrice = data.price.toFixed(2); filled.push('price'); }
                if (data.weight != null && !parseFloat(this.editWeight)) {
                    this.editWeight = data.weight;
                    if (data.weightUnit) this.editUnit = data.weightUnit;
                    filled.push('weight');
                }
                if (data.imageUrl && !this.item.image && !this.editImageUrl) {
                    this.editImageUrl = data.imageUrl;
                    filled.push('image');
                }
                this.fetchSuccess = filled.length
                    ? `Filled: ${filled.join(', ')}`
                    : 'No data found — fields unchanged';
            } catch (err) {
                this.fetchError = err.message;
            } finally {
                this.fetchLoading = false;
            }
        },
        addTag() {
            const tag = this.tagInput.trim().toLowerCase();
            if (tag && !this.editTags.includes(tag)) this.editTags.push(tag);
            this.tagInput = '';
        },
        removeTag(tag) {
            this.editTags = this.editTags.filter((t) => t !== tag);
        },
        onImageDrop(evt) {
            this.imageDragOver = false;
            const file = evt.dataTransfer.files[0];
            if (file) this.uploadImageFile(file);
        },
        onImageFileChange(evt) {
            const file = evt.target.files[0];
            if (file) this.uploadImageFile(file);
            evt.target.value = '';
        },
        async uploadImageFile(file) {
            const VALID = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
            if (!VALID.includes(file.type)) {
                this.imageUploadError = 'File must be PNG, JPG, GIF or WebP.';
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                this.imageUploadError = 'File must be under 5 MB.';
                return;
            }
            this.imageUploadError = '';
            this.editImageUploading = true;
            try {
                const formData = new FormData();
                formData.append('image', file);
                const res = await fetch('/imageUpload', { method: 'POST', body: formData, credentials: 'same-origin' });
                const data = await res.json();
                if (!res.ok) throw new Error(data.message || 'Upload failed');
                this.editImageUrl = data.data.url;
                this.$store.commit('updateItemImageUrl', { imageUrl: data.data.url, item: this.item });
            } catch (err) {
                this.imageUploadError = err.message;
            } finally {
                this.editImageUploading = false;
            }
        },
    },
};
</script>
