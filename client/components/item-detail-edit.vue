<template>
    <div>
        <item-detail-header
            :name="editName || $t('gearroom.unnamedItem')"
            :brand="editBrand || ''"
            :category="editCategory || ''"
            :image-key="item.image || ''"
            :image-url="item.imageUrl || ''"
            :starred="localStarred"
            @toggle-star="toggleStar"
            @view-image="viewImage"
        />

        <!-- Edit form -->
        <form class="itemDetailEditForm" @submit.prevent="saveEdit">
            <div class="itemDetailField">
                <label>{{ $t('item.editLabelName') }}</label>
                <div class="itemDetailNameWrap">
                    <input
                        ref="name"
                        v-model="editName"
                        type="text"
                        autocomplete="off"
                        role="combobox"
                        aria-autocomplete="list"
                        :aria-label="$t('item.editLabelName')"
                        :aria-expanded="nameSuggestions.length > 0 ? 'true' : 'false'"
                        :aria-controls="nameListId"
                        :aria-activedescendant="nameActiveIndex >= 0 ? `${nameListId}-${nameActiveIndex}` : null"
                        :placeholder="$t('item.editPlaceholderName')"
                        :autofocus="initialFocus === 'name'"
                        @input="onNameInput"
                        @blur="closeNameSuggestions"
                        @keydown.down.prevent="moveNameSuggestion(1)"
                        @keydown.up.prevent="moveNameSuggestion(-1)"
                        @keydown.enter="onNameEnter"
                        @keydown.escape="nameSuggestions = []"
                    >
                    <ul v-if="nameSuggestions.length" :id="nameListId" ref="nameList" class="itemDetailNameSuggestions" role="listbox" :aria-label="$t('item.nameSuggestionsLabel')">
                        <li
                            v-for="(s, i) in nameSuggestions"
                            :id="`${nameListId}-${i}`"
                            :key="s.id"
                            class="itemDetailNameSuggestion"
                            role="option"
                            :aria-selected="i === nameActiveIndex ? 'true' : 'false'"
                            :class="{ active: i === nameActiveIndex }"
                            @mousedown.prevent="applySuggestion(s)"
                        >
                            <span class="itemDetailNameSuggestionName">{{ s.name }}</span>
                            <span v-if="s.brand" class="itemDetailNameSuggestionBrand">{{ s.brand }}</span>
                            <span class="itemDetailNameSuggestionWeight">{{ suggestionWeight(s) }}</span>
                        </li>
                    </ul>
                    <span class="itemDetailNameStatus" role="status" aria-live="polite">{{ nameSuggestions.length ? $t('item.nameSuggestionsStatus', { count: nameSuggestions.length }) : '' }}</span>
                </div>
            </div>

            <div class="itemDetailField">
                <label>{{ $t('item.editLabelDescription') }}</label>
                <textarea ref="description" v-model="editDescription" :placeholder="$t('item.editPlaceholderDescription')" :autofocus="initialFocus === 'description'" />
            </div>

            <div class="itemDetailField">
                <label>{{ $t('item.editLabelBrand') }}</label>
                <item-brand-input v-model="editBrand" />
            </div>

            <div class="itemDetailField">
                <label>{{ $t('item.editLabelType') }}</label>
                <!-- A closed list, like the tag form: the type is one of GEAR_CATEGORIES. -->
                <div class="itemDetailSelectWrap itemDetailTypeWrap">
                    <select v-model="editCategory" class="itemDetailTypeSelect">
                        <option value="">
                            {{ $t('item.metaSelectNone') }}
                        </option>
                        <option v-for="cat in gearCategories" :key="cat" :value="cat">
                            {{ cat }}
                        </option>
                    </select>
                </div>
            </div>

            <div class="itemDetailFieldRow">
                <div class="itemDetailField">
                    <label>{{ $t('item.editLabelWeight') }}</label>
                    <div class="itemDetailUnitRow">
                        <input v-model="editWeight" type="text" placeholder="0" @input="weightTouched = true">
                        <div class="itemDetailSelectWrap itemDetailSelectUnit">
                            <select v-model="editUnit" @change="convertWeightUnit($event.target.value)">
                                <option v-for="u in units" :key="u" :value="u">
                                    {{ u }}
                                </option>
                            </select>
                        </div>
                    </div>
                </div>
                <div class="itemDetailField">
                    <label>{{ $t('item.editLabelPrice') }}</label>
                    <input v-model="editPrice" type="text" placeholder="0.00">
                </div>
                <div class="itemDetailField">
                    <label>{{ $t('item.editLabelQty') }}</label>
                    <input v-model="editQty" type="text" placeholder="1" :disabled="!hasListContext">
                </div>
            </div>

            <div v-if="hasListContext" class="itemDetailField itemDetailListOptions">
                <label>{{ $t('item.editLabelListOptions') }}</label>
                <div class="itemDetailToggleRow">
                    <label v-if="showWornOption" class="itemDetailToggle">
                        <input
                            v-model="editWorn"
                            type="checkbox"
                            :title="$t('item.wornTitle')"
                            @change="onWornChange"
                        >
                        <span>{{ $t('public.worn') }}</span>
                    </label>
                    <label v-if="showConsumableOption" class="itemDetailToggle">
                        <input
                            v-model="editConsumable"
                            type="checkbox"
                            :title="$t('item.consumableTitle')"
                            @change="onConsumableChange"
                        >
                        <span>{{ $t('public.consumable') }}</span>
                    </label>
                    <label class="itemDetailToggle">
                        <input
                            v-model="editOptional"
                            type="checkbox"
                            :title="$t('item.optionalTitle')"
                            @change="onOptionalChange"
                        >
                        <span>{{ $t('public.option') }}</span>
                    </label>
                </div>
            </div>

            <div class="itemDetailField">
                <label>{{ $t('item.editLabelPurchaseUrl') }}</label>
                <div class="itemDetailUrlRow">
                    <input v-model="editUrl" type="text" :placeholder="$t('item.editPlaceholderUrl')" @keydown.enter.prevent="fetchGear">
                    <button type="button" class="lpButton lpSmall lpButtonSecondary itemDetailFetchBtn" :disabled="fetchLoading || !editUrl" @click="fetchGear">
                        {{ fetchLoading ? $t('item.editButtonFetching') : $t('item.editButtonFetch') }}
                    </button>
                </div>
                <span v-if="fetchError" class="itemDetailFetchError">{{ fetchError }}</span>
                <span v-if="fetchSuccess" class="itemDetailFetchSuccess">{{ fetchSuccess }}</span>
            </div>

            <div class="itemDetailField">
                <label>{{ $t('item.editLabelImage') }} <span class="itemDetailFieldOptional">{{ $t('item.editLabelImageOptional') }}</span></label>
                <div
                    class="itemDetailDropZone"
                    :class="{ 'itemDetailDropZoneActive': imageDragOver, 'itemDetailDropZoneHasImage': editImageUrl || editImageUploading }"
                    @dragover.prevent="imageDragOver = true"
                    @dragleave="imageDragOver = false"
                    @drop.prevent="onImageDrop"
                    @click="$refs.imageFileInput.click()"
                >
                    <input ref="imageFileInput" type="file" accept="image/png,image/jpeg,image/gif,image/webp" style="display: none;" @change="onImageFileChange">
                    <template v-if="editImageUploading">
                        <span class="itemDetailDropZoneUploading">{{ $t('item.editImageUploading') }}</span>
                    </template>
                    <template v-else-if="editImageUrl">
                        <img :src="editImageUrl" class="itemDetailDropZonePreview">
                        <button type="button" class="itemDetailDropZoneRemove" @click.stop="editImageUrl = ''">
                            ×
                        </button>
                    </template>
                    <template v-else>
                        <svg class="itemDetailDropZoneIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <path d="m21 15-5-5L5 21" />
                        </svg>
                        <span class="itemDetailDropZoneText">{{ $t('item.editDropZoneText') }}</span>
                        <span class="itemDetailDropZoneHint">{{ $t('item.editDropZoneHint') }}</span>
                    </template>
                </div>
                <span v-if="imageUploadError" class="itemDetailFetchError">{{ imageUploadError }}</span>
            </div>

            <div class="itemDetailField">
                <label>{{ $t('item.editLabelTags') }}</label>
                <div class="itemDetailTagsEdit">
                    <span v-for="tag in editTags" :key="tag" class="itemDetailTagChip">
                        {{ tag }}
                        <button type="button" class="lpIconButton itemDetailTagRemove" @click="removeTag(tag)">×</button>
                    </span>
                </div>
                <div class="itemDetailTagInput">
                    <input v-model="tagInput" type="text" :placeholder="$t('item.editPlaceholderTags')" @keydown.enter.prevent="addTag">
                    <button type="button" class="lpButton lpSmall lpButtonSecondary" @click="addTag">
                        {{ $t('item.editButtonAddTag') }}
                    </button>
                </div>
            </div>
        </form>

        <div class="itemDetailEditFooter">
            <a class="lpHref close" role="button" tabindex="0" @click="$emit('close')" @keydown.enter="$emit('close')" @keydown.space.prevent="$emit('close')">{{ $t('item.editButtonCancel') }}</a>
            <button class="lpButton" @click="saveEdit">
                {{ $t('item.editButtonSave') }}
            </button>
        </div>
    </div>
</template>

<script>
import ItemDetailHeader from './item-detail-header.vue';
import ItemBrandInput from './item-brand-input.vue';
import { openDialog } from '../services/dialogs';
import { GEAR_CATEGORIES } from '../data/gear-categories';
import { normalizeTag, normalizeTags } from '../services/item-tags';
import { uploadErrorMessage } from '../utils/upload-errors';
import { suggestItems } from '../composables/useGearMatcher';

const weightUtils = require('../utils/weight.js');

const UNITS = ['oz', 'lb', 'g', 'kg'];

export default {
    name: 'ItemDetailEdit',
    components: { ItemDetailHeader, ItemBrandInput },
    props: {
        item: { type: Object, required: true },
        categoryItem: { type: Object, default: null },
        category: { type: Object, default: null },
        initialFocus: { type: String, default: 'name' },
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
            // The real weight in mg behind the weight field, and whether the field was typed in
            // since. An untouched field keeps the exact stored weight instead of its rounded display.
            weightMg: 0,
            weightTouched: false,
            shownUnit: 'g',
            editPrice: '0.00',
            editQty: 1,
            editWorn: false,
            editConsumable: false,
            editOptional: false,
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
            nameSuggestions: [],
            nameActiveIndex: -1,
        };
    },
    computed: {
        library() {
            return this.$store.state.library;
        },
        gearCategories() { return GEAR_CATEGORIES; },
        units() { return UNITS; },
        hasListContext() {
            return !!(this.categoryItem && this.category);
        },
        showWornOption() {
            return !!(this.library && this.library.optionalFields && this.library.optionalFields.worn);
        },
        showConsumableOption() {
            return !!(this.library && this.library.optionalFields && this.library.optionalFields.consumable);
        },
        nameListId() {
            return `itemDetailNameList-${this.item.id}`;
        },
        thumbnailImage() {
            if (this.editImageUrl) return this.editImageUrl;
            if (this.item.image) return `https://i.imgur.com/${this.item.image}l.jpg`;
            return this.item.imageUrl || null;
        },
    },
    watch: {
        'item.starred': function (val) { this.localStarred = !!val; },
    },
    created() {
        this.localStarred = !!this.item?.starred;
        this.editName = this.item.name || '';
        this.editDescription = this.item.description || '';
        this.editBrand = this.item.brand || '';
        // A value outside the list (an old free-text type) shows as "None" instead of a blank select.
        this.editCategory = GEAR_CATEGORIES.includes(this.item.category) ? this.item.category : '';
        this.editUnit = (this.library && this.library.itemUnit) || 'g';
        this.editWeight = weightUtils.MgToItemWeight(this.item.weight, this.editUnit);
        this.weightMg = this.item.weight || 0;
        this.shownUnit = this.editUnit;
        this.editPrice = this.item.price != null ? this.item.price.toFixed(2) : '0.00';
        if (this.categoryItem) {
            this.editQty = this.categoryItem.qty === 0 ? (this.categoryItem.qtyBeforeOptional || 1) : this.categoryItem.qty;
        } else {
            this.editQty = '-';
        }
        this.editWorn = !!this.categoryItem?.worn;
        this.editConsumable = !!this.categoryItem?.consumable;
        this.editOptional = this.categoryItem ? this.categoryItem.qty === 0 : false;
        this.editUrl = this.item.url || '';
        this.editImageUrl = this.item.imageUrl || '';
        this.editTags = [...(this.item.tags || [])];
    },
    mounted() {
        this.focusInitialField();
    },
    beforeUnmount() {
        clearTimeout(this.nameCloseTimer);
    },
    methods: {
        focusInitialField() {
            const field = this.$refs[this.initialFocus] || this.$refs.name;
            if (field) field.focus();
        },
        toggleStar() {
            const starred = !this.localStarred;
            this.$store.commit('updateItemMetadata', { ...this.item, starred });
            this.localStarred = starred;
        },
        viewImage() {
            openDialog('itemViewImage', this.thumbnailImage);
        },
        onWornChange() {
            if (this.editWorn) this.editConsumable = false;
        },
        onConsumableChange() {
            if (this.editConsumable) this.editWorn = false;
        },
        onOptionalChange() {
            if (!this.editOptional && (!parseFloat(this.editQty) || parseFloat(this.editQty) <= 0)) {
                this.editQty = this.categoryItem?.qtyBeforeOptional || 1;
            }
        },
        // Changing the unit converts the number, so the item keeps the same real weight
        // (690 g becomes 24.34 oz, not 690 oz).
        convertWeightUnit(newUnit) {
            const mg = this.weightTouched
                ? weightUtils.WeightToMg(parseFloat(this.editWeight) || 0, this.shownUnit)
                : this.weightMg;
            this.weightMg = mg;
            this.weightTouched = false;
            this.editWeight = weightUtils.MgToItemWeight(mg, newUnit);
            this.shownUnit = newUnit;
        },
        saveEdit() {
            const weightFloat = parseFloat(this.editWeight) || 0;
            const tags = normalizeTags(this.editTags, this.tagInput);
            const updatedItem = {
                ...this.item,
                name: this.editName.trim(),
                description: this.editDescription.trim(),
                brand: this.editBrand.trim(),
                category: this.editCategory,
                url: this.editUrl.trim(),
                imageUrl: this.editImageUrl.trim() || undefined,
                tags,
                authorUnit: this.editUnit,
                weight: this.weightTouched ? weightUtils.WeightToMg(weightFloat, this.editUnit) : this.weightMg,
                price: Math.round((parseFloat(this.editPrice) || 0) * 100) / 100,
            };
            this.editTags = tags;
            this.tagInput = '';
            this.$store.commit('updateItem', updatedItem);

            let updatedCategoryItem = this.categoryItem;
            if (this.categoryItem && this.category) {
                const qtyFloat = parseFloat(this.editQty);
                const desiredQty = Number.isNaN(qtyFloat) ? 1 : qtyFloat;
                const wasOptional = this.categoryItem.qty === 0;

                if (!this.editOptional && wasOptional) {
                    this.$store.commit('toggleOptionalItem', {
                        category: this.category,
                        itemId: this.item.id,
                    });
                }

                const liveCategoryItem = this.category.getCategoryItemById(this.item.id) || this.categoryItem;
                updatedCategoryItem = {
                    ...liveCategoryItem,
                    qty: this.editOptional && wasOptional ? 0 : desiredQty,
                    worn: this.editWorn,
                    consumable: this.editConsumable,
                };
                if (this.editOptional && wasOptional) {
                    updatedCategoryItem.qtyBeforeOptional = desiredQty;
                }
                this.$store.commit('updateCategoryItem', {
                    category: this.category,
                    categoryItem: updatedCategoryItem,
                });

                if (this.editOptional && !wasOptional) {
                    this.$store.commit('toggleOptionalItem', {
                        category: this.category,
                        itemId: this.item.id,
                    });
                    updatedCategoryItem = this.category.getCategoryItemById(this.item.id);
                }
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
                    // The fetched number is in the fetched unit: take it as typed, no conversion.
                    this.weightTouched = true;
                    this.shownUnit = this.editUnit;
                    filled.push('weight');
                }
                if (data.imageUrl && !this.item.image && !this.editImageUrl) {
                    this.editImageUrl = data.imageUrl;
                    filled.push('image');
                }
                this.fetchSuccess = filled.length
                    ? this.$t('item.editMessageFilling', { fields: filled.join(', ') })
                    : this.$t('item.editMessageNoDataFound');
            } catch (err) {
                this.fetchError = err.message;
            } finally {
                this.fetchLoading = false;
            }
        },
        // Gear Room suggestions while typing the name. Only user typing opens them, so a name
        // loaded from the item never pops the list open.
        onNameInput() {
            const others = this.library.items.filter((i) => i.id !== this.item.id);
            this.nameSuggestions = suggestItems(this.editName, others, this.category && this.category.name);
            this.nameActiveIndex = -1;
        },
        closeNameSuggestions() {
            clearTimeout(this.nameCloseTimer);
            this.nameCloseTimer = setTimeout(() => { this.nameSuggestions = []; this.nameActiveIndex = -1; }, 120);
        },
        moveNameSuggestion(dir) {
            if (!this.nameSuggestions.length) return;
            const max = this.nameSuggestions.length - 1;
            this.nameActiveIndex = Math.min(Math.max(this.nameActiveIndex + dir, -1), max);
            this.$nextTick(() => {
                const active = this.$refs.nameList && this.$refs.nameList.querySelector('.itemDetailNameSuggestion.active');
                if (active) active.scrollIntoView({ block: 'nearest' });
            });
        },
        // Enter picks the highlighted suggestion; otherwise it behaves as before.
        onNameEnter(evt) {
            const picked = this.nameSuggestions[this.nameActiveIndex];
            if (!picked) return;
            evt.preventDefault();
            this.applySuggestion(picked);
        },
        suggestionWeight(item) {
            const unit = this.library.itemUnit;
            return `${weightUtils.MgToItemWeight(item.weight, unit)} ${unit}`;
        },
        // Prefill from a Gear Room item. The name is always replaced; every other field is only
        // filled when still empty, so details already typed are never overwritten.
        applySuggestion(item) {
            this.editName = item.name || '';
            if (!this.editBrand && item.brand) this.editBrand = item.brand;
            if (!this.editCategory && GEAR_CATEGORIES.includes(item.category)) this.editCategory = item.category;
            if (!this.editDescription && item.description) this.editDescription = item.description;
            if (!this.editUrl && item.url) this.editUrl = item.url;
            if (!this.editImageUrl && item.imageUrl) this.editImageUrl = item.imageUrl;
            if (!parseFloat(this.editPrice) && item.price) this.editPrice = item.price.toFixed(2);
            if (!parseFloat(this.editWeight) && item.weight) {
                this.weightMg = item.weight;
                this.weightTouched = false;
                this.editWeight = weightUtils.MgToItemWeight(item.weight, this.editUnit);
                this.shownUnit = this.editUnit;
            }
            if (!this.editTags.length && item.tags && item.tags.length) this.editTags = [...item.tags];
            this.nameSuggestions = [];
            this.nameActiveIndex = -1;
        },
        addTag() {
            const tag = normalizeTag(this.tagInput);
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
                this.imageUploadError = this.$t('item.editImageError');
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                this.imageUploadError = this.$t('item.editImageErrorSize');
                return;
            }
            this.imageUploadError = '';
            this.editImageUploading = true;
            try {
                const formData = new FormData();
                formData.append('image', file);
                const res = await fetch('/imageUpload', { method: 'POST', body: formData, credentials: 'same-origin' });
                const data = await res.json();
                if (!res.ok) throw Object.assign(new Error('Upload refused'), data);
                this.editImageUrl = data.data.url;
                this.$store.commit('updateItemImageUrl', { imageUrl: data.data.url, item: this.item });
            } catch (err) {
                this.imageUploadError = uploadErrorMessage((key, params) => this.$t(key, params), err);
            } finally {
                this.editImageUploading = false;
            }
        },
    },
};
</script>

<style lang="scss" scoped>
@import "../css/_item-detail-edit";
</style>
