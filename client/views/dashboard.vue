<style lang="scss">
@import "../css/_dashboard";
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
                    <router-link to="/community" class="lpTarget">{{ $t('dash.community') }}</router-link>
                </span>
                <span v-if="isGuide" class="headerItem">
                    <router-link to="/guide" class="lpTarget">{{ $t('dash.guide') }}</router-link>
                </span>
                <share />
                <listSettings />
                <accountDropdown v-if="isSignedIn" />
                <span v-else class="headerItem signInRegisterButtons">
                    <guestSettings />
                    <router-link to="/register" class="lpButton lpSmall">{{ $t('dash.register') }}</router-link>
                    {{ $t('auth.or') }}
                    <router-link to="/signin" class="lpButton lpSmall">{{ $t('dash.signIn') }}</router-link>
                </span>
                <span class="clearfix" />
            </div>

            <div v-if="isSignedIn && emailVerified === false && !verifyBannerDismissed" class="lpVerifyBanner">
                <span v-if="verifyResendSent">{{ $t('dash.verificationEmailSent') }}</span>
                <template v-else>
                    <span>{{ $t('dash.verifyEmailPrompt') }}</span>
                    <button class="lpVerifyBannerBtn" @click="resendVerification">{{ $t('dash.resendEmail') }}</button>
                    <span v-if="verifyResendError" class="lpVerifyBannerError">{{ verifyResendError }}</span>
                </template>
                <button class="lpVerifyBannerDismiss" @click="dismissVerifyBanner">✕</button>
            </div>

            <div v-if="billingSuccess" class="lpBillingSuccessBanner">
                ✓ {{ $t('dash.thankYouZenPak') }} {{ $t('dash.planNowActive', { plan: planLabel }) }}
            </div>
            <div v-if="billingCancelled" class="lpBillingCancelBanner">
                {{ $t('dash.billingCancelled') }}
            </div>
            <div v-if="billingManaged" class="lpBillingSuccessBanner">
                ✓ {{ $t('dash.billingManaged') }}
            </div>
<div v-if="isPastDue" class="lpPastDueBanner">
                <span>⚠ {{ $t('dash.paymentFailed') }} {{ planLabel }} {{ $t('dash.plan') }}.</span>
                <button @click="openPortal" class="lpButton lpButtonDanger lpButtonSmall">{{ $t('dash.fixPayment') }}</button>
            </div>

            <list />

            <upgrade-prompt v-if="showGuideUpgrade" tier="guide" feature="creatorInsights" mode="modal" :open="showGuideUpgrade" @close="showGuideUpgrade = false" />

            <div v-if="isSignedIn" class="lpSupportZone">
                <profile-insights v-if="isGuide" />
                <upgrade-prompt v-else-if="isTrail" tier="guide" feature="creatorInsights" mode="inline" />
                <template v-else>
                    <p>{{ $t('dash.enjoyingApp') }}</p>
                    <router-link to="/about" class="lpHref">{{ $t('dash.learnMore') }}</router-link>
                </template>
            </div>

            <div id="lpFooter">
                <div class="lpSiteBy">
                    {{ $t('dash.footerBuiltOn') }} <a class="lpHref" href="https://github.com/galenmaly/lighterpack" target="_blank" rel="noopener noreferrer">LighterPack</a>.
                </div>
                <div class="lpContact">
                    <a class="lpHref" href="https://github.com/zenpakapp/zenpak" target="_blank" rel="noopener noreferrer">{{ $t('dash.footerOpenSource') }}</a>
                    -
                    <a class="lpHref" href="/privacy">{{ $t('dash.footerPrivacy') }}</a>
                    -
                    <a class="lpHref" href="/terms">{{ $t('dash.footerTerms') }}</a>
                    -
                    <a class="lpHref" href="/legal">{{ $t('dash.footerLegal') }}</a>
                    -
                    <a class="lpHref" href="mailto:info@zenpak.app">{{ $t('dash.footerContact') }}</a>
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
import guestSettings from '../components/guest-settings.vue';

export default {
    name: 'Dashboard',
    components: {
        sidebar,
        themeToggle,
        share,
        listSettings,
        accountDropdown,
        guestSettings,
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
            billingManaged: false,
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
            const map = { supporter: 'Kin', creator: 'Wayfarer' };
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
        if (this.$route && this.$route.query.billing === 'managed') {
            fetch('/api/billing/me', { credentials: 'include' })
                .then(r => r.ok ? r.json() : null)
                .then(data => { if (data) this.$store.commit('setBilling', data); })
                .catch(() => {});
            this.billingManaged = true;
            window.scrollTo({ top: 0, behavior: 'smooth' });
            setTimeout(() => { this.billingManaged = false; }, 6000);
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
