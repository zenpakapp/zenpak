<style lang="scss">
@import "../css/_globals";

.lpThemeItem {
    align-items: center;
    color: $color-text-muted;
    cursor: pointer;
    display: inline-flex;
    font-size: 16px;
    justify-content: center;
    line-height: 0;
    padding: 0;
    transition: color $transitionDurationFast ease;

    &:hover {
        color: $color-text;
    }
}

.lpThemeGlyph {
    display: block;
    line-height: 1;
    position: relative;
    top: -1px;
    user-select: none;
}
</style>

<template>
    <a class="lpThemeItem" @click="cycleTheme">
        <span class="lpThemeGlyph">{{ mode === 'dark' ? '☾' : mode === 'light' ? '☀' : '⚙' }}</span>
    </a>
 </template>

<script>
import { useTheme } from '../composables/useTheme.js';

export default {
    name: 'ThemeToggle',
    setup() {
        const { mode, cycleTheme } = useTheme();
        return { mode, cycleTheme };
    },
};
</script>
