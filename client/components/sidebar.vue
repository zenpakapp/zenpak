<style lang="scss">
@import "../css/_globals";

$sidebarWidth: 280px;
$sidebarOverflow: 1000px;
$sidebarPadding: 20px;

#sidebar {
    background: $color-surface;
    border-right: 1px solid $color-border;
    box-shadow: $shadow-soft;
    color: $color-text;
    height: 100%;
    margin-left: -$sidebarOverflow;
    opacity: 0;
    padding-left: $sidebarOverflow + $sidebarPadding;
    padding-right: $sidebarPadding;
    position: fixed;
    transition: opacity $transitionDurationSlow ease-in-out 0s;
    width: $sidebarWidth + $sidebarOverflow + $sidebarPadding*2;
    z-index: $sidebar;

    .lpHasSidebar & {
        opacity: 1;
    }

    h1 {
        @include fullBleedLeft();

        align-items: center;
        border-bottom: 1px solid $color-border;
        display: flex;
        height: 60px;
        margin: 0 (-$space-20) $space-20 0;
        padding: $space-20 0 $space-20;
        position: relative;

        span {
            color: $color-accent-text;
            font-weight: $fontWeight-bold;
        }
    }

    section {
        position: relative;
    }

    h2 {
        color: $color-text;
        font-size: $fontSize-md;
        font-weight: $fontWeight-bold;
        margin: 0 0 $space-10;
    }

    // The sidebar is the panel: its lists are plain rows with dividers, not cards inside a card.
    ul {
        margin: 0;
        overflow-x: hidden;
        padding: 0;
    }

    .lpHref {
        color: $color-accent-text;
    }
}

#scrollable {
    display: flex;
    flex-direction: column;
    height: 100%;
    // Clip, not hidden: a hidden box can still be scrolled by script, and opening the new-list menu
    // scrolled this one 20px to the left on a phone, cutting off the edge of every row.
    overflow: clip;
    padding-bottom: $space-20;
    position: relative;
    top: 0;

    @supports not (overflow: clip) {
        overflow: hidden;
    }

    > h1 {
        flex: 0 0 auto;
    }
}

@media (max-width: $bp-tablet) {
    #sidebar {
        box-shadow: $shadow-drawer;
        margin-left: 0;
        opacity: 0;
        padding-left: $sidebarPadding;
        transform: translateX(-100%);
        transition: opacity $transitionDurationSlow ease-in-out, transform $transitionDurationSlow ease-in-out;
        width: $sidebarWidth + $sidebarPadding * 2;
        z-index: $dialog;

        .lpHasSidebar & {
            opacity: 1;
            transform: translateX(0);
        }
    }

    .lpSidebarOverlay {
        background: $color-overlay;
        bottom: 0;
        display: none;
        left: 0;
        position: fixed;
        right: 0;
        top: 0;
        z-index: $dialog - 1;

        .lpHasSidebar & {
            display: block;
        }
    }
}

.lpGearSection {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
}

.lpGearSectionHeader {
    align-items: center;
    color: $color-text;
    display: flex;
    flex: 0 0 auto;
    font-size: $fontSize-md;
    font-weight: $fontWeight-bold;
    justify-content: space-between;
    margin: 0 0 $space-10;
}

.lpGearRoomBtn {
    white-space: nowrap;
}

.lpThemeToggle {
    background: transparent;
    border: none;
    border-radius: $radius-md;
    color: $color-text-muted;
    cursor: pointer;
    font-size: $fontSize-md;
    line-height: 1;
    padding: $space-2 $space-4;
    transition: color $transitionDurationFast;

    &:hover {
        color: $color-text;
    }
}

// Reduced motion: the drawer appears and fades, it does not slide.
@media (prefers-reduced-motion: reduce) {
    :root #sidebar {
        transition: opacity $transitionDuration ease;
    }
}
</style>

<template>
    <div>
        <div class="lpSidebarOverlay" @click="closeSidebar" />
        <div id="sidebar">
            <div id="scrollable">
                <h1>
                    {{ $t('dash.zenPakSidebar') }}
                </h1>

                <libraryLists />
                <section class="lpGearSection">
                    <h2 class="lpGearSectionHeader">
                        {{ $t('dash.items') }}
                        <button class="lpButton lpSmall lpButtonSecondary lpGearRoomBtn" @click="$emit('open-gear-room')">
                            {{ $t('dash.itemLibrary') }}
                        </button>
                    </h2>
                    <libraryItems :show-title="false" />
                </section>
            </div>
        </div>
    </div>
</template>

<script>
import libraryItems from './library-items.vue';
import libraryLists from './library-lists.vue';

export default {
    name: 'Sidebar',
    components: {
        libraryItems,
        libraryLists,
    },
    emits: ['open-gear-room'],
    methods: {
        closeSidebar() {
            this.$store.commit('toggleSidebar');
        },
    },
};
</script>
