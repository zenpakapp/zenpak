<style lang="scss">
@import "../css/_globals";

#header {
    align-items: center;
    background: $color-surface;
    border-bottom: 1px solid $color-border;
    display: flex;
    gap: 4px;
    margin-bottom: 20px;
    margin-left: -20px;
    min-height: 60px;
    padding: 0 8px;
    position: sticky;
    top: 0;
    width: calc(100% + 40px);
    z-index: $belowDialog;
}

.lpVerifyBanner {
    align-items: center;
    background: color-mix(in srgb, $color-accent 10%, transparent);
    border: 1px solid color-mix(in srgb, $color-accent 30%, transparent);
    border-radius: $radius-sm;
    color: $color-text;
    display: flex;
    font-size: 13px;
    gap: 12px;
    margin-bottom: 16px;
    padding: 10px 14px;
}

.lpVerifyBannerBtn {
    background: transparent;
    border: 1px solid $color-accent;
    border-radius: $radius-sm;
    color: $color-accent;
    cursor: pointer;
    font-size: 12px;
    font-weight: 500;
    padding: 3px 10px;
    transition: opacity 0.15s;
    white-space: nowrap;

    &:hover { opacity: 0.7; }
}

.lpVerifyBannerError {
    color: $color-text-muted;
}

.lpVerifyBannerDismiss {
    background: transparent;
    border: none;
    color: $color-text-muted;
    cursor: pointer;
    font-size: 14px;
    margin-left: auto;
    opacity: 0.6;
    padding: 0 2px;

    &:hover { opacity: 1; }
}

.lpBillingSuccessBanner {
    background: #d1fae5;
    border: 1px solid #34d399;
    color: #065f46;
    padding: 12px 16px;
    border-radius: 6px;
    margin-bottom: 16px;
}
.lpBillingCancelBanner {
    background: #fef3c7;
    border: 1px solid #fbbf24;
    color: #92400e;
    padding: 12px 16px;
    border-radius: 6px;
    margin-bottom: 16px;
}
.lpPastDueBanner {
    background: #fff3cd;
    border: 1px solid #ffc107;
    color: #856404;
    padding: 12px 16px;
    border-radius: 6px;
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    gap: 12px;
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
    min-width: 0;
    padding: 10px 14px;
    width: 100%;

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
    height: auto;
    padding: 0;
    position: relative;
    transition: color $transitionDurationFast ease;

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
        line-height: 1;
        min-height: 40px;
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
        background: rgba(var(--color-accent-rgb), 0.04);
        border-color: transparent;
        box-shadow: none;
        color: $color-text;
        transform: none;
    }

    &#lpListName {
        flex: 1 1 240px;
        min-width: 0;
    }

    &.hasPopover {
        padding: 0;
    }

    &.signInRegisterButtons {
        height: auto;
        padding: 0 16px;
    }
}

.headerItem:not(#lpListName) {
    align-items: center;
    display: flex;
    min-height: 60px;
}

.headerIconItem {
    justify-content: center;
    min-width: 40px;
}

.headerTruncateItem {
    flex: 0 1 auto;
    min-width: 0;
}

.headerTruncateItem .lpPopover,
.headerTruncateItem .lpPopover .lpTarget {
    max-width: 100%;
    min-width: 0;
}

.headerMenuLabel {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.headerItem .lpPopover {
    align-items: center;
    display: flex;
    position: relative;
}

.headerItem .lpPopover::after {
    content: "";
    height: 12px;
    left: 0;
    position: absolute;
    right: 0;
    top: 100%;
}

.headerItem .lpPopover .lpTarget {
    align-items: center;
    display: inline-flex;
    line-height: 1;
    margin-bottom: 0;
    padding-bottom: 0;
}

.headerItem .lpPopover .lpTarget > span {
    align-items: center;
    display: inline-flex;
    gap: 8px;
    line-height: 1;
    position: relative;
    top: -5px;
}

.headerItem .lpSprite {
    flex: 0 0 auto;
    top: 0;
    vertical-align: middle;
}

@media (max-width: 1240px) {
    #header {
        gap: 2px;
        padding: 0 6px;
    }

    #lpListName {
        font-size: 15px;
        padding: 10px 8px;
    }

    .headerItem .lpTarget {
        gap: 6px;
        padding: 10px 10px;
    }

    .headerItem .lpPopover .lpTarget > span {
        gap: 6px;
    }

    .headerTruncateItem .headerMenuLabel {
        max-width: 128px;
    }
}

@media (max-width: 1080px) {
    .headerItem .lpTarget {
        font-size: 15px;
        padding: 10px 8px;
    }

    .headerIconItem {
        min-width: 32px;
    }

    .headerTruncateItem .headerMenuLabel {
        max-width: 96px;
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
                <input id="lpListName" :value="list ? list.name : ''" type="text" class="lpListName lpSilent headerItem" value="New List" placeholder="List Name" autocomplete="off" name="lastpass-disable-search" @input="updateListName">
                <span class="headerItem headerIconItem">
                    <themeToggle />
                </span>
                <span v-if="isSignedIn" class="headerItem headerIconItem">
                    <notifications />
                </span>
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

            <div v-if="isSignedIn && emailVerified === false && !verifyBannerDismissed" class="lpVerifyBanner">
                <span v-if="verifyResendSent">Verification email sent! Check your inbox.</span>
                <template v-else>
                    <span>Verify your email to share lists publicly.</span>
                    <button class="lpVerifyBannerBtn" @click="resendVerification">Resend email</button>
                    <span v-if="verifyResendError" class="lpVerifyBannerError">{{ verifyResendError }}</span>
                </template>
                <button class="lpVerifyBannerDismiss" @click="dismissVerifyBanner">✕</button>
            </div>

            <div v-if="billingSuccess" class="lpBillingSuccessBanner">
                ✓ Thank you for supporting ZenPak! Your {{ planLabel }} plan is now active.
            </div>
            <div v-if="billingCancelled" class="lpBillingCancelBanner">
                No worries — you can upgrade whenever you're ready.
            </div>
<div v-if="isPastDue" class="lpPastDueBanner">
                <span>⚠ Your payment failed. Update your payment method to keep your {{ planLabel }} plan.</span>
                <button @click="openPortal" class="lpButton lpButtonDanger lpButtonSmall">Fix payment</button>
            </div>

            <list />

            <upgrade-prompt v-if="showGuideUpgrade" tier="guide" feature="creatorInsights" mode="modal" :open="showGuideUpgrade" @close="showGuideUpgrade = false" />

            <div v-if="isSignedIn" class="lpSupportZone">
                <profile-insights v-if="isGuide" />
                <upgrade-prompt v-else-if="isTrail" tier="guide" feature="creatorInsights" mode="inline" />
                <template v-else>
                    <p>Enjoying the app? Support the project and get a public profile to share your picks with the community.</p>
                    <router-link to="/about" class="lpHref">Learn more →</router-link>
                </template>
            </div>

            <div id="lpFooter">
                <div class="lpSiteBy">
                    ZenPak is an independent open-source packing tool built on <a class="lpHref" href="https://github.com/galenmaly/lighterpack" target="_blank" rel="noopener noreferrer">LighterPack</a>.
                </div>
                <div class="lpContact">
                    <a class="lpHref" href="https://github.com/zenpakapp/zenpak" target="_blank" rel="noopener noreferrer">Open source</a>
                    -
                    <a class="lpHref" href="mailto:info@zenpak.app">Contact</a>
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
import { fetchJson } from '../utils/utils.js';
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
import notifications from '../components/notifications.vue';

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
        notifications,
    },
    data() {
        return {
            isLoaded: false,
            showGuideUpgrade: false,
            verifyResendSent: false,
            verifyResendError: null,
            verifyBannerDismissed: !!localStorage.getItem('verifyBannerDismissed'),
            billingSuccess: false,
            billingCancelled: false,
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
            if (!this.library || typeof this.library.getListById !== 'function') return null;
            return this.library.getListById(this.library.defaultListId);
        },
        isSignedIn() {
            return this.$store.state.loggedIn;
        },
        isGuide() {
            const lib = this.$store.state.library;
            return lib && lib.entitlements && lib.entitlements.plan === 'creator';
        },
        isTrail() {
            const lib = this.$store.state.library;
            return lib && lib.entitlements && lib.entitlements.plan === 'supporter';
        },
        isBase() {
            const lib = this.$store.state.library;
            return !lib || !lib.entitlements || isBase(lib.entitlements);
        },
        emailVerified() {
            return this.$store.state.emailVerified;
        },
        isPastDue() {
            const billing = this.$store.state.billing;
            return billing && billing.status === 'past_due';
        },
        planLabel() {
            const map = { supporter: 'Trail', creator: 'Guide' };
            const billing = this.$store.state.billing;
            return map[billing && billing.plan] || 'plan';
        },
    },
    watch: {
        emailVerified(val) {
            if (val === true) {
                localStorage.removeItem('verifyBannerDismissed');
                this.verifyBannerDismissed = false;
            }
        },
    },
    created() {
        if (!this.$store.state.library) {
            push('/welcome');
        } else {
            this.isLoaded = true;
        }
        if (this.$route && this.$route.query.upgradeGuide) {
            this.showGuideUpgrade = true;
        }
        if (this.$route && this.$route.query.billing === 'success') {
            fetch('/api/billing/me', { credentials: 'include' })
                .then(r => r.ok ? r.json() : null)
                .then(data => { if (data) this.$store.commit('setBilling', data); })
                .catch(() => {});
            this.billingSuccess = true;
            window.scrollTo({ top: 0, behavior: 'smooth' });
            setTimeout(() => { this.billingSuccess = false; }, 6000);
        }
        if (this.$route && this.$route.query.billing === 'cancel') {
            this.billingCancelled = true;
            window.scrollTo({ top: 0, behavior: 'smooth' });
            setTimeout(() => { this.billingCancelled = false; }, 6000);
        }
    },
    methods: {
        toggleSidebar() {
            this.$store.commit('toggleSidebar');
        },
        updateListName(evt) {
            if (!this.list) return;
            this.$store.commit('updateListName', { id: this.list.id, name: evt.target.value });
        },
        dismissVerifyBanner() {
            localStorage.setItem('verifyBannerDismissed', '1');
            this.verifyBannerDismissed = true;
        },
        resendVerification() {
            this.verifyResendError = null;
            fetchJson('/resendVerification', { method: 'POST', credentials: 'same-origin' })
                .then(() => { this.verifyResendSent = true; })
                .catch((err) => { this.verifyResendError = (err && err.message) || 'An error occurred.'; });
        },
        async openPortal() {
            try {
                const res = await fetch('/api/billing/portal-session', {
                    method: 'POST', credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                });
                const data = await res.json();
                if (data.url) window.location.href = data.url;
            } catch (_) {}
        },
    },
};
</script>
