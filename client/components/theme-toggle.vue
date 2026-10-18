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
    position: relative;
    top: -1px;
}
</style>

<template>
    <a class="lpThemeItem" role="button" tabindex="0" @click="cycleTheme" @keydown.enter="cycleTheme" @keydown.space.prevent="cycleTheme">
        <svg class="lpThemeGlyph" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path v-if="mode === 'dark'" d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
            <template v-else-if="mode === 'light'">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
            </template>
            <template v-else>
                <rect x="2" y="4" width="20" height="13" rx="2" />
                <path d="M8 21h8M12 17v4" />
            </template>
        </svg>
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
