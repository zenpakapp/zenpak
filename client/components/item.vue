<style lang="scss">
@import "../css/_item";
</style>

<template>
    <li :id="item.id" :data-item-id="item.id" :class="itemRowClasses" @dblclick="!isPackingMode && openDetail()">
        <span class="lpHandleCell">
            <input
                v-if="isPackingMode"
                type="checkbox"
                class="lpPackCheckbox"
                :checked="isPacked"
                @change="onPackCheckbox"
            >
            <div v-else class="lpItemHandle lpHandle" :title="$t('item.reorderItemTitle')" />
        </span>
        <span v-if="library.optionalFields['images']" class="lpImageCell">
            <img v-if="thumbnailImage" class="lpItemImage" :src="thumbnailImage" @click="viewItemImage()">
        </span>
        <span class="lpNameCell">
            <input v-model="editName" v-focus-on-create="categoryItem._isNew" type="text" class="lpName lpSilent" :placeholder="$t('item.namePlaceholder')" :aria-label="$t('item.namePlaceholder')" @change="saveItemText" @blur="saveItemText">
            <input v-model="editDescription" type="text" class="lpDescription lpSilent" :placeholder="$t('item.descriptionPlaceholder')" :aria-label="$t('item.descriptionPlaceholder')" @change="saveItemText" @blur="saveItemText">
            <span v-if="categoryItem.qty === 0" class="lpItemOptionalBadge">{{ $t('public.option') }}</span>
            <span v-if="hasItemMeta" class="lpItemMeta">
                <span v-if="item.brand" class="lpItemBrand">{{ item.brand }}</span>
                <span v-for="tag in itemTags" :key="tag" class="lpItemTag">{{ tag }}</span>
            </span>
        </span>
        <span v-if="!isPackingMode" class="lpActionsCell">
            <button type="button" class="lpSprite lpActionBtn lpCamera" :title="$t('item.imageTitle')" :aria-label="$t('item.imageTitle')" @click="updateItemImage" />
            <button type="button" class="lpSprite lpActionBtn lpLink" :class="{lpActive: item.url}" :title="$t('item.linkTitle')" :aria-label="$t('item.linkTitle')" @click="updateItemLink" />
            <button type="button" class="lpSprite lpActionBtn lpTag" :class="{lpActive: hasItemMeta}" :title="$t('item.metaTitle')" :aria-label="$t('item.metaTitle')" @click="updateItemMeta" />
            <button v-if="library.optionalFields['worn']" type="button" class="lpSprite lpActionBtn lpWorn" :class="{lpActive: categoryItem.worn}" :title="$t('item.wornTitle')" :aria-label="$t('item.wornTitle')" :aria-pressed="!!categoryItem.worn" @click="toggleWorn" />
            <button v-if="library.optionalFields['consumable']" type="button" class="lpSprite lpActionBtn lpConsumable" :class="{lpActive: categoryItem.consumable}" :title="$t('item.consumableTitle')" :aria-label="$t('item.consumableTitle')" :aria-pressed="!!categoryItem.consumable" @click="toggleConsumable" />
            <button type="button" class="lpSprite lpActionBtn lpOptionDot" :class="{lpActive: categoryItem.qty === 0}" :title="$t('item.optionalTitle')" :aria-label="$t('item.optionalTitle')" :aria-pressed="categoryItem.qty === 0" @click="toggleOptional" />
            <button type="button" :class="'lpSprite lpActionBtn lpStar lpStar' + categoryItem.star" :title="$t('item.ratingTitle')" :aria-label="$t('item.ratingTitle')" @click="cycleStar" />
            <button type="button" class="lpSprite lpActionBtn lpEdit" :title="$t('item.editTitle')" :aria-label="$t('item.editTitle')" @click="openDetailEdit" />
        </span>
        <span v-if="library.optionalFields['price']" class="lpPriceCell">
            <input v-model="displayPrice" v-empty-if-zero type="text" :aria-label="$t('item.priceLabel', { name: itemLabel })" :class="{lpPrice: true, lpNumber: true, lpSilent: true, lpSilentError: priceError}" @input="savePrice" @blur="setDisplayPrice">
        </span>
        <span class="lpWeightCell lpNumber">
            <input v-model="displayWeight" v-empty-if-zero type="text" :aria-label="$t('item.weightLabel', { name: itemLabel })" :class="{lpWeight: true, lpNumber: true, lpSilent: true, lpSilentError: weightError}" @input="saveWeight" @keydown.up="incrementWeight($event)" @keydown.down="decrementWeight($event)">
            <span class="lpUnit">{{ library.itemUnit }}</span>
        </span>
        <span class="lpQtyCell">
            <input v-model="displayQty" type="text" :aria-label="$t('item.qtyLabel', { name: itemLabel })" :class="{lpQty: true, lpNumber: true, lpSilent: true, lpSilentError: qtyError}" :title="categoryItem.qty === 0 ? $t('item.optionalQtyTitle') : null" @input="saveQty" @keydown.up="incrementQty($event)" @keydown.down="decrementQty($event)">
            <span class="lpArrows" aria-hidden="true">
                <button type="button" class="lpSprite lpActionBtn lpUp" tabindex="-1" @click="incrementQty($event)" />
                <button type="button" class="lpSprite lpActionBtn lpDown" tabindex="-1" @click="decrementQty($event)" />
            </span>
        </span>
        <span class="lpRemoveCell">
            <a v-if="!isPackingMode" class="lpRemove lpRemoveItem" role="button" tabindex="0" :title="$t('item.removeTitle')" :aria-label="$t('item.removeTitle')" @click="removeItem" @keydown.enter="removeItem" @keydown.space.prevent="removeItem"><i class="lpSprite lpSpriteRemove" /></a>
        </span>
    </li>
</template>

<script>
import { openDialog } from '../services/dialogs';
import { showGlobalAlert } from '../services/user-feedback';

const weightUtils = require('../utils/weight.js');

export default {
    name: 'Item',
    props: ['category', 'itemContainer', 'isPackingMode', 'packedItemIds'],
    data() {
        return {
            displayWeight: 0,
            displayPrice: 0,
            displayQty: 0,
            weightError: false,
            priceError: false,
            qtyError: false,
            editName: '',
            editDescription: '',
            numStars: 4,
        };
    },
    computed: {
        library() {
            return this.$store.state.library;
        },
        item() {
            return this.itemContainer.item;
        },
        categoryItem() {
            return { ...this.itemContainer.categoryItem };
        },
        thumbnailImage() {
            if (this.item.image) {
                return `https://i.imgur.com/${this.item.image}s.jpg`;
            } if (this.item.imageUrl) {
                return this.item.imageUrl;
            }
            return '';
        },
        fullImage() {
            if (this.item.image) {
                return `https://i.imgur.com/${this.item.image}l.jpg`;
            } if (this.item.imageUrl) {
                return this.item.imageUrl;
            }
            return '';
        },
        itemLabel() {
            return this.item.name || this.$t('gearroom.unnamedItem');
        },
        isPacked() {
            return this.isPackingMode && this.packedItemIds && this.packedItemIds.has(this.item.id);
        },
        itemTags() {
            return Array.isArray(this.item.tags) ? this.item.tags.filter(Boolean) : [];
        },
        hasItemMeta() {
            return !!(this.item.brand || this.item.category || this.itemTags.length);
        },
        itemRowClasses() {
            return [
                'lpItem',
                this.item.classes || '',
                {
                    lpQtyZero: parseFloat(this.categoryItem.qty) <= 0,
                    lpItemPacked: this.isPacked,
                },
            ];
        },
    },
    watch: {
        'item.weight': function () {
            this.setDisplayWeight();
        },
        'item.price': function () {
            this.setDisplayPrice();
        },
        'library.itemUnit': function () {
            this.setDisplayWeight();
        },
        categoryItem() {
            this.setDisplayQty();
        },
        'item.name': function (value) {
            if (value !== this.editName) this.editName = value || '';
        },
        'item.description': function (value) {
            if (value !== this.editDescription) this.editDescription = value || '';
        },
    },
    created() {
        this.editName = this.item.name || '';
        this.editDescription = this.item.description || '';
        this.setDisplayWeight();
        this.setDisplayPrice();
        this.setDisplayQty();
    },
    methods: {
        saveItemText() {
            if (this.editName === this.item.name && this.editDescription === this.item.description) return;
            this.$store.commit('updateItemMetadata', {
                ...this.item,
                name: this.editName,
                description: this.editDescription,
            });
        },
        saveMeasuredItem() {
            this.$store.commit('updateItem', this.item);
        },
        saveCategoryItem() {
            this.$store.commit('updateCategoryItem', { category: this.category, categoryItem: this.categoryItem });
        },
        savePrice() {
            const priceFloat = parseFloat(this.displayPrice, 10);

            if (!Number.isNaN(priceFloat)) {
                this.item.price = Math.round(priceFloat * 100) / 100;
                this.saveMeasuredItem();
                this.priceError = false;
            } else {
                this.priceError = true;
            }
        },
        saveQty() {
            const qtyFloat = parseFloat(this.displayQty, 10);

            if (!Number.isNaN(qtyFloat)) {
                this.categoryItem.qty = qtyFloat;
                this.saveCategoryItem();
                this.qtyError = false;
            } else {
                this.qtyError = true;
            }
        },
        saveWeight() {
            const weightFloat = parseFloat(this.displayWeight, 10);

            if (!Number.isNaN(weightFloat)) {
                // Retyping what is already shown must not replace the exact stored weight with
                // its rounded display (28.349 g shown as 0.028 kg would become 28 g).
                const shown = weightUtils.MgToItemWeight(this.item.weight, this.library.itemUnit);
                if (weightFloat !== shown) {
                    this.item.weight = weightUtils.WeightToMg(weightFloat, this.library.itemUnit);
                    this.saveMeasuredItem();
                }
                this.weightError = false;
            } else {
                this.weightError = true;
            }
        },
        setDisplayPrice() {
            if (!this.priceError) {
                this.displayPrice = (this.item.price ?? 0).toFixed(2);
            }
        },
        setDisplayQty() {
            if (!this.qtyError) {
                this.displayQty = this.categoryItem.qty;
            }
        },
        setDisplayWeight() {
            this.displayWeight = weightUtils.MgToItemWeight(this.item.weight, this.library.itemUnit);
        },
        openDetail() {
            this.openItemDetail({
                item: this.item,
                categoryItem: this.categoryItem,
                category: this.category,
            });
        },
        openDetailEdit() {
            this.openItemDetail({
                item: this.item,
                categoryItem: this.categoryItem,
                category: this.category,
                startEditing: true,
            });
        },
        openItemDetail(payload) {
            openDialog('itemDetail', payload).catch(() => {
                showGlobalAlert(this.$t('item.detailOpenError'));
            });
        },
        updateItemLink() {
            openDialog('itemLink', this.item);
        },
        updateItemMeta() {
            openDialog('itemMeta', this.item);
        },
        updateItemImage() {
            openDialog('itemImage', this.item);
        },
        viewItemImage() {
            openDialog('itemViewImage', this.fullImage);
        },
        toggleWorn() {
            if (this.categoryItem.consumable) {
                return;
            }
            this.categoryItem.worn = !this.categoryItem.worn;
            this.saveCategoryItem();
        },
        toggleConsumable() {
            if (this.categoryItem.worn) {
                return;
            }
            this.categoryItem.consumable = !this.categoryItem.consumable;
            this.saveCategoryItem();
        },
        toggleOptional() {
            this.$store.commit('toggleOptionalItem', { category: this.category, itemId: this.item.id });
        },
        cycleStar() {
            if (!this.categoryItem.star) {
                this.categoryItem.star = 0;
            }
            this.categoryItem.star = (this.categoryItem.star + 1) % this.numStars;
            this.saveCategoryItem();
        },
        incrementQty(evt) {
            evt.stopImmediatePropagation();

            if (this.qtyError) {
                return;
            }

            this.categoryItem.qty += 1;
            this.saveCategoryItem();
        },
        decrementQty(evt) {
            evt.stopImmediatePropagation();

            if (this.qtyError) {
                return;
            }

            this.categoryItem.qty -= 1;

            if (this.categoryItem.qty < 0) {
                this.categoryItem.qty = 0;
            }

            this.saveCategoryItem();
        },
        incrementWeight(evt) {
            evt.stopImmediatePropagation();

            if (this.weightError) {
                return;
            }

            const newWeight = weightUtils.MgToItemWeight(this.item.weight, this.library.itemUnit) + 1;
            this.item.weight = weightUtils.WeightToMg(newWeight, this.library.itemUnit);

            this.saveMeasuredItem();
        },
        decrementWeight(evt) {
            evt.stopImmediatePropagation();

            if (this.weightError) {
                return;
            }

            const newWeight = weightUtils.MgToItemWeight(this.item.weight, this.library.itemUnit) - 1;
            this.item.weight = weightUtils.WeightToMg(newWeight, this.library.itemUnit);

            if (this.item.weight < 0) {
                this.item.weight = 0;
            }

            this.saveMeasuredItem();
        },
        removeItem() {
            this.$store.commit('removeItemFromCategory', { itemId: this.item.id, category: this.category });
        },
        onPackCheckbox() {
            this.$emit('toggle-pack', this.item.id);
        },
    },
};
</script>,
