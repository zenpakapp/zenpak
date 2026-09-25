<template>
    <div class="itemDetailFieldBrand">
        <input
            :value="modelValue"
            type="text"
            placeholder="e.g. Sea to Summit"
            autocomplete="off"
            @input="$emit('update:modelValue', $event.target.value)"
            @focus="dropdownOpen = true; activeIndex = -1"
            @blur="closeDropdown"
            @keydown.down.prevent="moveIndex(1)"
            @keydown.up.prevent="moveIndex(-1)"
            @keydown.enter.prevent="selectSuggestion(activeIndex)"
            @keydown.escape="dropdownOpen = false; activeIndex = -1"
        >
        <ul v-if="dropdownOpen && suggestionsFiltered.length" ref="brandList" class="brandSuggestions">
            <li
                v-for="(brand, i) in suggestionsFiltered"
                :key="brand"
                class="brandSuggestion"
                :class="{ active: i === activeIndex }"
                @mousedown.prevent="selectByClick(brand)"
            >
                {{ brand }}
            </li>
        </ul>
    </div>
</template>

<script>
export default {
    name: 'ItemBrandInput',
    props: {
        modelValue: { type: String, default: '' },
    },
    emits: ['update:modelValue'],
    data() {
        return {
            dropdownOpen: false,
            activeIndex: -1,
        };
    },
    computed: {
        knownBrands() {
            const library = this.$store.state.library;
            if (!library || !library.items) return [];
            const brands = new Set();
            library.items.forEach((item) => {
                if (item.brand) brands.add(item.brand);
            });
            return [...brands].sort().map((brand) => ({
                label: brand,
                search: brand.toLowerCase(),
            }));
        },
        suggestionsFiltered() {
            const brands = this.knownBrands;
            if (!this.modelValue) return brands.map((brand) => brand.label);
            const q = this.modelValue.toLowerCase();
            return brands.reduce((suggestions, brand) => {
                if (brand.search.includes(q)) suggestions.push(brand.label);
                return suggestions;
            }, []);
        },
    },
    methods: {
        closeDropdown() {
            setTimeout(() => { this.dropdownOpen = false; this.activeIndex = -1; }, 120);
        },
        moveIndex(dir) {
            if (!this.dropdownOpen) return;
            const max = this.suggestionsFiltered.length - 1;
            this.activeIndex = Math.min(Math.max(this.activeIndex + dir, -1), max);
            this.$nextTick(() => {
                const list = this.$refs.brandList;
                if (!list) return;
                const active = list.querySelector('.brandSuggestion.active');
                if (active) active.scrollIntoView({ block: 'nearest' });
            });
        },
        selectSuggestion(index) {
            if (index >= 0 && this.suggestionsFiltered[index]) {
                this.$emit('update:modelValue', this.suggestionsFiltered[index]);
            }
            this.dropdownOpen = false;
            this.activeIndex = -1;
        },
        selectByClick(brand) {
            this.$emit('update:modelValue', brand);
            this.dropdownOpen = false;
            this.activeIndex = -1;
        },
    },
};
</script>

<style lang="scss" scoped>
@import "../css/_globals";

.itemDetailFieldBrand {
    position: relative;
}

.brandSuggestions {
    background: $color-surface;
    border: 1px solid $color-border;
    border-radius: 6px;
    box-shadow: 0 4px 16px rgba(var(--color-shadow-rgb), 0.12);
    left: 0;
    list-style: none;
    margin: 0;
    max-height: 200px;
    overflow-y: auto;
    padding: 4px 0;
    position: absolute;
    right: 0;
    top: calc(100% + 4px);
    z-index: 20;
}

.brandSuggestion {
    cursor: pointer;
    font-size: $fontSize-sm;
    padding: 7px 12px;

    &:hover,
    &.active {
        background: rgba(var(--color-accent-rgb), 0.08);
        color: $color-accent;
    }
}
</style>
