<style lang="scss">
@import "../css/_item-meta";
</style>

<template>
    <modal id="itemMetaDialog" :shown="shown" @hide="cancel">
        <h2>Edit gear details</h2>
        <form class="itemMetaForm" @submit.prevent="save">
            <div class="itemMetaField">
                <span class="itemMetaLabel">Brand</span>
                <input
                    id="itemMetaBrand"
                    v-model="brand"
                    type="text"
                    class="itemMetaInput"
                    placeholder="e.g. Sea to Summit"
                    autocomplete="off"
                    @focus="brandDropdownOpen = true; brandActiveIndex = -1"
                    @blur="closeBrandDropdown"
                    @keydown.down.prevent="moveBrandIndex(1)"
                    @keydown.up.prevent="moveBrandIndex(-1)"
                    @keydown.enter.prevent="selectBrandSuggestion(brandActiveIndex)"
                    @keydown.escape="brandDropdownOpen = false; brandActiveIndex = -1"
                >
                <ul v-if="brandDropdownOpen && brandSuggestionsFiltered.length" ref="brandList" class="itemMetaBrandSuggestions">
                    <li
                        v-for="(b, i) in brandSuggestionsFiltered"
                        :key="b"
                        class="itemMetaBrandSuggestion"
                        :class="{ active: i === brandActiveIndex }"
                        @mousedown.prevent="brand = b; brandDropdownOpen = false; brandActiveIndex = -1"
                    >{{ b }}</li>
                </ul>
            </div>

            <div class="itemMetaField">
                <span class="itemMetaLabel">Type</span>
                <div class="itemMetaSelectWrap">
                    <select id="itemMetaCategory" v-model="category" class="itemMetaSelect">
                        <option value="">— none —</option>
                        <option v-for="cat in gearCategories" :key="cat" :value="cat">{{ cat }}</option>
                    </select>
                </div>
            </div>

            <div class="itemMetaField">
                <span class="itemMetaLabel">Tags</span>
                <div class="itemMetaTags">
                    <span v-for="tag in tags" :key="tag" class="itemMetaTag">
                        {{ tag }}
                        <button type="button" @click="removeTag(tag)">×</button>
                    </span>
                </div>
                <div class="itemMetaTagInput">
                    <input v-model="tagInput" type="text" class="itemMetaInput" placeholder="Add a tag…" @keydown.enter.prevent="addTag">
                    <button type="button" @click="addTag">Add</button>
                </div>
            </div>

            <div class="itemMetaActions">
                <a class="lpHref close" @click="cancel">Cancel</a>
                <input type="submit" class="lpButton" value="Save">
            </div>
        </form>
    </modal>
</template>

<script>
import modal from './modal.vue';
import { registerDialogOpener, unregisterDialogOpener } from '../services/dialogs';

const GEAR_CATEGORIES = [
    'Pack & Bags', 'Shelter', 'Sleep', 'Clothing', 'Water', 'Food', 'Cook',
    'Navigation', 'Safety', 'Hygiene', 'Essentials', 'Other',
];

export default {
    name: 'ItemMeta',
    components: { modal },
    data() {
        return {
            shown: false,
            item: null,
            brand: '',
            category: '',
            tags: [],
            tagInput: '',
            brandDropdownOpen: false,
            brandActiveIndex: -1,
        };
    },
    computed: {
        gearCategories() {
            return GEAR_CATEGORIES;
        },
        knownBrands() {
            const library = this.$store.state.library;
            if (!library || !library.items) return [];
            return [...new Set(
                library.items.map((i) => i.brand).filter(Boolean),
            )].sort();
        },
        brandSuggestionsFiltered() {
            if (!this.brand) return this.knownBrands;
            const q = this.brand.toLowerCase();
            return this.knownBrands.filter(b => b.toLowerCase().includes(q));
        },
    },
    mounted() {
        registerDialogOpener('itemMeta', (item) => {
            this.item = item;
            this.brand = item.brand || '';
            this.category = item.category || '';
            this.tags = [...(item.tags || [])];
            this.tagInput = '';
            this.shown = true;
        });
    },
    beforeUnmount() {
        unregisterDialogOpener('itemMeta');
    },
    methods: {
        closeBrandDropdown() {
            setTimeout(() => { this.brandDropdownOpen = false; this.brandActiveIndex = -1; }, 150);
        },
        moveBrandIndex(dir) {
            const max = this.brandSuggestionsFiltered.length - 1;
            this.brandActiveIndex = Math.min(Math.max(this.brandActiveIndex + dir, -1), max);
            this.$nextTick(() => {
                const list = this.$refs.brandList;
                if (!list) return;
                const active = list.children[this.brandActiveIndex];
                if (active) active.scrollIntoView({ block: 'nearest' });
            });
        },
        selectBrandSuggestion(index) {
            if (index >= 0 && index < this.brandSuggestionsFiltered.length) {
                this.brand = this.brandSuggestionsFiltered[index];
            }
            this.brandDropdownOpen = false;
            this.brandActiveIndex = -1;
        },
        addTag() {
            const tag = this.tagInput.trim().toLowerCase();
            if (tag && !this.tags.includes(tag)) {
                this.tags.push(tag);
            }
            this.tagInput = '';
        },
        removeTag(tag) {
            this.tags = this.tags.filter((t) => t !== tag);
        },
        save() {
            this.$store.commit('updateItem', {
                ...this.item,
                brand: this.brand.trim(),
                category: this.category,
                tags: [...this.tags],
            });
            this.shown = false;
        },
        cancel() {
            this.shown = false;
        },
    },
};
</script>
