<template>
    <svg
        class="lpIcon"
        :class="{ lpIconFilled: solid }"
        :width="size"
        :height="size"
        viewBox="0 0 24 24"
        :fill="solid ? 'currentColor' : 'none'"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
        focusable="false"
    >
        <path v-for="d in shape.paths" :key="d" :d="d" />
    </svg>
</template>

<script>
import ICONS from '../data/icon-paths';

// One SVG icon, in the colour of the text around it (currentColor): the theme, the hover and the
// on/off state are set by CSS on the parent, never by a filter on an image. 16px with a 2px stroke
// is the size the row icons use. `filled` draws the solid form when the icon has one.
export default {
    name: 'Icon',
    props: {
        name: { type: String, required: true },
        size: { type: Number, default: 16 },
        filled: { type: Boolean, default: false },
    },
    computed: {
        shape() {
            return ICONS[this.name] || { paths: [], fillable: false };
        },
        solid() {
            return this.filled && this.shape.fillable;
        },
    },
};
</script>

<style lang="scss">
@import "../css/globals";

.lpIcon {
    display: block;
    flex: none;
}

.lpIconCompact {
    height: $icon-size-xs;
    width: $icon-size-xs;
}
</style>
