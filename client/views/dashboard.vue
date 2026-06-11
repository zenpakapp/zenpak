<style lang="scss">
@import "../css/_globals";

#header {
    align-items: center;
    background: $color-surface;
    border-bottom: 1px solid $color-border;
    display: flex;
    gap: 2px;
    margin: 0 -20px 20px;
    min-height: 60px;
    padding: 0 8px;
    position: sticky;
    top: 0;
    z-index: $belowDialog;
}

#hamburger {
    align-items: center;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    gap: 4px;
    justify-content: center;
    opacity: 0.6;
    padding: 4px;
    transition: transform $transitionDurationSlow, opacity $transitionDurationFast;

    &:hover {
        opacity: 1;
    }

    .lpHasSidebar & {
        opacity: 1;
    }

    .lpHamburgerLine {
        background: $color-text;
        border-radius: 2px;
        display: block;
        height: 2px;
        transition: transform $transitionDurationFast, opacity $transitionDurationFast;
        width: 20px;
    }
}

@media (max-width: 768px) {
    #sidebar {
        transform: translateX(-100%);
        transition: transform $transitionDurationSlow ease-in-out;

        .lpHasSidebar & {
            opacity: 1;
            transform: translateX(0);
        }
    }

    #main .lpList {
        margin-left: 0 !important;
    }
}

#lpListName {
    background: transparent;
    border-radius: $radius-sm;
    color: $color-text;
    font-size: $fontSize-md;
    font-weight: $fontWeight-bold;
    letter-spacing: -0.01em;
    padding: 10px 14px;

    &::placeholder {
        color: $color-text-muted;
        font-weight: $fontWeight-normal;
    }
}

.lpThemeToggleNav {
    cursor: pointer;

    .lpThemeIcon {
        align-items: center;
        display: inline-flex;
        font-size: 16px;
        height: 60px;
    }
}

.headerItem {
    flex: 0 0 auto;
    color: $color-text-muted;
    height: 100%;
    padding: 10px 12px;
    position: relative;
    transition: color $transitionDurationFast ease;

    &:first-child {
        padding-left: 12px;
    }


    .lpPopover {
        &:hover .lpTarget {
            color: $color-accent;
        }
    }

    .lpTarget {
        align-items: center;
        border: 1px solid transparent;
        border-radius: 999px;
        color: $color-text;
        display: inline-flex;
        font-weight: 600;
        gap: 8px;
        padding: 10px 14px;
        text-decoration: none;
        transition:
            background-color $transitionDurationFast ease,
            border-color $transitionDurationFast ease,
            box-shadow $transitionDurationFast ease,
            color $transitionDurationFast ease,
            transform $transitionDurationFast ease;

        i {
            opacity: 0.95;
        }
    }

    .lpPopover:hover .lpTarget,
    .lpPopover.lpPopoverShown .lpTarget {
        background: rgba(var(--color-accent-rgb), 0.08);
        border-color: rgba(var(--color-accent-rgb), 0.14);
        box-shadow: 0 8px 18px rgba(17, 24, 39, 0.08);
        color: $color-accent;
        transform: translateY(-1px);
    }

    &#lpListName {
        flex: 1 0 auto;
    }

    &.hasPopover {
        padding: 0;
    }

    &.signInRegisterButtons {
        height: auto;
        padding: 0 16px;
    }
}

.lpSupportZone {
    border-top: 1px solid $color-border;
    color: $color-text-muted;
    font-size: $fontSize-sm;
    margin-top: 32px;
    padding: 16px 0 8px;

    p {
        margin: 0 0 6px;
    }
}
</style>

<template>
    <div v-if="isLoaded" id="main" :class="{lpHasSidebar: library.showSidebar}">
        <sidebar @open-gear-room="$store.commit('setGearRoomOpen', true)" />
        <gear-room v-if="gearRoomOpen" @close="$store.commit('setGearRoomOpen', false)" />
        <div v-show="!gearRoomOpen" class="lpList lpTransition">
            <div id="header" class="clearfix">
                <span class="headerItem">
                    <a id="hamburger" class="lpTransition" @click="toggleSidebar">
                        <span class="lpHamburgerLine" />
                        <span class="lpHamburgerLine" />
                        <span class="lpHamburgerLine" />
                    </a>
                </span>
                <input id="lpListName" :value="list.name" type="text" class="lpListName lpSilent headerItem" value="New List" placeholder="List Name" autocomplete="off" name="lastpass-disable-search" @input="updateListName">
                <themeToggle />
                <span v-if="isSignedIn" class="headerItem">
                    <router-link to="/community" class="lpTarget">Community</router-link>
                </span>
                <span v-if="isGuide" class="headerItem">
                    <router-link to="/guide" class="lpTarget">Guide</router-link>
                </span>
                <share />
                <listSettings />
                <accountDropdown v-if="isSignedIn" />
                <span v-else class="headerItem signInRegisterButtons">
                    <router-link to="/register" class="lpButton lpSmall">Register</router-link>
                    or
                    <router-link to="/signin" class="lpButton lpSmall">Sign In</router-link>
                </span>
                <span class="clearfix" />
            </div>

            <list />

            <profile-insights v-if="isGuide" />
            <upgrade-prompt v-else-if="isSignedIn && !isGuide" tier="guide" feature="creatorInsights" mode="inline" />

            <div v-if="isSignedIn && isBase" class="lpSupportZone">
                <p>Like what you see? Trail and Guide plans support this project and unlock your public profile.</p>
                <router-link to="/about" class="lpHref">Learn more →</router-link>
            </div>

            <div id="lpFooter">
                <div class="lpSiteBy">
                    LighterPack+ is an independent open-source continuation of <a class="lpHref" href="https://lighterpack.com" target="_blank" rel="noopener noreferrer">LighterPack</a>.
                </div>
                <div class="lpContact">
                    <a class="lpHref" href="https://github.com/fxbenard/lighterpack" target="_blank" rel="noopener noreferrer">Open source</a>
                    -
                    <a class="lpHref" href="mailto:info@lighterpack.app">Contact</a>
                </div>
            </div>
        </div>

        <globalAlerts />
        <speedbump />
        <copyList />
        <importCSV />
        <itemImage />
        <itemViewImage />
        <itemLink />
        <itemMeta />
        <itemDetail />
        <gearPicker />
        <help />
        <account />
        <accountDelete />
    </div>
</template>

<script>
import globalAlerts from '../components/global-alerts.vue';
import sidebar from '../components/sidebar.vue';
import share from '../components/share.vue';
import listSettings from '../components/list-settings.vue';
import accountDropdown from '../components/account-dropdown.vue';
import forgotPassword from './forgot-password.vue';
import account from '../components/account.vue';
import accountDelete from '../components/account-delete.vue';
import help from '../components/help.vue';
import list from '../components/list.vue';

import itemImage from '../components/item-image.vue';
import itemViewImage from '../components/item-view-image.vue';
import itemLink from '../components/item-link.vue';
import itemMeta from '../components/item-meta.vue';
import itemDetail from '../components/item-detail.vue';
import gearPicker from '../components/gear-picker.vue';
import importCSV from '../components/import-csv.vue';
import copyList from '../components/copy-list.vue';
import speedbump from '../components/speedbump.vue';
import gearRoom from '../components/gear-room.vue';
import profileInsights from '../components/profile-insights.vue';
import upgradePrompt from '../components/upgrade-prompt.vue';
import { push } from '../services/navigation';
import { isBase } from '../services/entitlements.js';
import themeToggle from '../components/theme-toggle.vue';

export default {
    name: 'Dashboard',
    components: {
        sidebar,
        themeToggle,
        share,
        listSettings,
        accountDropdown,
        forgotPassword,
        account,
        accountDelete,
        help,
        list,
        itemLink,
        itemMeta,
        itemDetail,
        gearPicker,
        copyList,
        importCSV,
        itemImage,
        itemViewImage,
        speedbump,
        globalAlerts,
        gearRoom,
        profileInsights,
        upgradePrompt,
    },
    data() {
        return {
            isLoaded: false,
        };
    },
    computed: {
        library() {
            return this.$store.state.library;
        },
        gearRoomOpen() {
            return this.$store.state.gearRoomOpen;
        },
        list() {
            return this.library.getListById(this.library.defaultListId);
        },
        isSignedIn() {
            return this.$store.state.loggedIn;
        },
        isGuide() {
            const lib = this.$store.state.library;
            return lib && lib.entitlements && lib.entitlements.plan === 'creator';
        },
        isBase() {
            const lib = this.$store.state.library;
            return !lib || !lib.entitlements || isBase(lib.entitlements);
        },
    },
    created() {
        if (!this.$store.state.library) {
            push('/welcome');
        } else {
            this.isLoaded = true;
        }
    },
    methods: {
        toggleSidebar() {
            this.$store.commit('toggleSidebar');
        },
        updateListName(evt) {
            this.$store.commit('updateListName', { id: this.list.id, name: evt.target.value });
        },
    },
};
</script>
