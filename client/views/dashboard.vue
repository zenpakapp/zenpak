<style lang="scss">
@import "../css/_dashboard";
</style>

<template>
    <div v-if="isInitializing" class="lpEditorLoading" role="status" aria-live="polite">
        <span class="lpEditorLoadingText">{{ $t('dash.loadingEditor') }}</span>
        <div class="lpEditorLoadingSidebar" aria-hidden="true">
            <span class="lpEditorLoadingBone lpEditorLoadingBrand" />
            <span v-for="index in 6" :key="`loading-nav-${index}`" class="lpEditorLoadingBone lpEditorLoadingNav" />
        </div>
        <div class="lpEditorLoadingContent" aria-hidden="true">
            <div class="lpEditorLoadingToolbar">
                <span class="lpEditorLoadingBone lpEditorLoadingTitle" />
                <span class="lpEditorLoadingBone lpEditorLoadingTitleMeta" />
                <span class="lpEditorLoadingBone lpEditorLoadingAction" />
            </div>
            <div class="lpEditorLoadingWorkspace">
                <div class="lpEditorLoadingSummary">
                    <span class="lpEditorLoadingBone lpEditorLoadingChart" />
                    <div class="lpEditorLoadingTotals">
                        <span v-for="index in 6" :key="`loading-total-${index}`" class="lpEditorLoadingBone" />
                    </div>
                </div>
                <div class="lpEditorLoadingList">
                    <span class="lpEditorLoadingBone lpEditorLoadingListTitle" />
                    <div class="lpEditorLoadingRows">
                        <div v-for="index in 7" :key="`loading-row-${index}`" class="lpEditorLoadingRow">
                            <span class="lpEditorLoadingBone" />
                            <span class="lpEditorLoadingBone" />
                            <span class="lpEditorLoadingBone" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <div v-else-if="isLoaded" id="main" :class="{lpHasSidebar: library.showSidebar}">
        <sidebar v-if="sidebarReady" @open-gear-room="openGearRoom" />
        <gear-room v-if="gearRoomOpen" @close="$store.commit('setGearRoomOpen', false)" />
        <div v-show="!gearRoomOpen" class="lpList lpTransition">
            <div id="header" class="clearfix">
                <span class="headerItem">
                    <a id="hamburger" class="lpTransition" role="button" tabindex="0" :aria-label="$t('dash.toggleSidebar')" @click="toggleSidebar" @keydown.enter="toggleSidebar" @keydown.space.prevent="toggleSidebar">
                        <span class="lpHamburgerLine" />
                        <span class="lpHamburgerLine" />
                        <span class="lpHamburgerLine" />
                    </a>
                </span>
                <span class="lpListTitleBlock headerItem">
                    <input id="lpListName" :value="list ? list.name : ''" type="text" class="lpListName lpSilent" value="New List" :placeholder="$t('dash.listNamePlaceholder')" autocomplete="off" name="lastpass-disable-search" @input="updateListName">
                    <span v-if="forkSource" class="lpForkSource">
                        {{ $t('dash.source') }}
                        <router-link v-if="forkSource.externalId" class="lpForkSourceLink" :to="`/p/${forkSource.externalId}`">
                            {{ forkSource.listName }}
                        </router-link>
                        <span v-else>{{ forkSource.listName }}</span>
                        <span v-if="forkSource.ownerName" class="lpForkSourceOwner">
                            ·
                            <router-link v-if="forkSource.ownerUsername" class="lpForkSourceLink" :to="`/u/${forkSource.ownerUsername}`">
                                {{ forkSource.ownerName }}
                            </router-link>
                            <span v-else>{{ forkSource.ownerName }}</span>
                        </span>
                    </span>
                </span>
                <span class="headerItem headerIconItem">
                    <themeToggle />
                </span>
                <span v-if="isSignedIn" class="headerItem headerIconItem">
                    <notifications />
                </span>
                <span v-if="isSignedIn" class="headerItem headerCommunityItem">
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
        <copyList />
        <component
            :is="dialog.component"
            v-for="dialog in loadedDialogs"
            :key="dialog.name"
        />
        <shortcuts-help />
        <speedbump />
    </div>
</template>

<script>
import { fetchJson } from '../utils/utils.js';
import globalAlerts from '../components/global-alerts.vue';
import sidebar from '../components/sidebar.vue';
import share from '../components/share.vue';
import listSettings from '../components/list-settings.vue';
import accountDropdown from '../components/account-dropdown.vue';
import list from '../components/list.vue';
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
import shortcutsHelp from '../components/shortcuts-help.vue';
import { registerDialogLoader, unregisterDialogLoader } from '../services/dialogs';
import { registerShortcut, unregisterShortcut } from '../services/shortcuts';

const lazyDialogs = {
    account: { component: 'account', loader: () => import(/* webpackChunkName: "dialog-account" */ '../components/account.vue') },
    deleteAccount: { component: 'accountDelete', loader: () => import(/* webpackChunkName: "dialog-account-delete" */ '../components/account-delete.vue') },
    gearPicker: { component: 'gearPicker', loader: () => import(/* webpackChunkName: "dialog-gear-picker" */ '../components/gear-picker.vue') },
    help: { component: 'help', loader: () => import(/* webpackChunkName: "dialog-help" */ '../components/help.vue') },
    importCSV: { component: 'importCSV', loader: () => import(/* webpackChunkName: "dialog-import-csv" */ '../components/import-csv.vue') },
    importLP: { component: 'importCSV', loader: () => import(/* webpackChunkName: "dialog-import-csv" */ '../components/import-csv.vue') },
    importText: { component: 'importCSV', loader: () => import(/* webpackChunkName: "dialog-import-csv" */ '../components/import-csv.vue') },
    itemDetail: { component: 'itemDetail', loader: () => import(/* webpackChunkName: "dialog-item-detail" */ '../components/item-detail.vue') },
    itemImage: { component: 'itemImage', loader: () => import(/* webpackChunkName: "dialog-item-image" */ '../components/item-image.vue') },
    itemLink: { component: 'itemLink', loader: () => import(/* webpackChunkName: "dialog-item-link" */ '../components/item-link.vue') },
    itemMeta: { component: 'itemMeta', loader: () => import(/* webpackChunkName: "dialog-item-meta" */ '../components/item-meta.vue') },
    itemViewImage: { component: 'itemViewImage', loader: () => import(/* webpackChunkName: "dialog-item-view-image" */ '../components/item-view-image.vue') },
};

export default {
    name: 'Dashboard',
    components: {
        sidebar,
        themeToggle,
        share,
        listSettings,
        accountDropdown,
        guestSettings,
        list,
        copyList,
        speedbump,
        globalAlerts,
        gearRoom,
        profileInsights,
        upgradePrompt,
        notifications,
        shortcutsHelp,
    },
    data() {
        return {
            isLoaded: false,
            sidebarReady: false,
            sidebarFrame: null,
            sidebarMediaQuery: null,
            showGuideUpgrade: false,
            verifyResendSent: false,
            verifyResendError: null,
            verifyBannerDismissed: !!localStorage.getItem('verifyBannerDismissed'),
            billingSuccess: false,
            billingCancelled: false,
            billingManaged: false,
            loadingPrivateLibrary: false,
            loadedDialogs: [],
            dialogLoaders: [],
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
        forkSource() {
            const forkedFrom = this.list && this.list.forkedFrom;
            if (!forkedFrom || !forkedFrom.listName) return null;
            if (forkedFrom.ownerUsername && forkedFrom.ownerUsername === this.$store.state.loggedIn) return null;
            return forkedFrom;
        },
        isSignedIn() {
            return this.$store.state.loggedIn;
        },
        initializationStatus() {
            return this.$store.state.initializationStatus;
        },
        isInitializing() {
            return this.initializationStatus === 'loading';
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
        initializationStatus: {
            immediate: true,
            handler(status) {
                if (status !== 'ready') return;

                if (!this.library) {
                    if (this.isSignedIn && !this.loadingPrivateLibrary) {
                        this.loadingPrivateLibrary = true;
                        this.$store.dispatch('init')
                            .then(() => {
                                if (this.library) this.prepareDashboard();
                                else push('/welcome');
                            })
                            .catch(() => {
                                push('/welcome');
                            })
                            .finally(() => {
                                this.loadingPrivateLibrary = false;
                            });
                        return;
                    }
                    push('/welcome');
                    return;
                }

                this.prepareDashboard();
            },
        },
        emailVerified(val) {
            if (val === true) {
                localStorage.removeItem('verifyBannerDismissed');
                this.verifyBannerDismissed = false;
            }
        },
    },
    created() {
        Object.entries(lazyDialogs).forEach(([name, dialog]) => {
            const loader = () => this.loadDialog(dialog.component, dialog.loader);
            this.dialogLoaders.push({ name, loader });
            registerDialogLoader(name, loader);
        });
        this.sidebarMediaQuery = window.matchMedia('(max-width: 768px)');
        this.sidebarMediaQuery.addEventListener('change', this.handleSidebarBreakpoint);
        registerShortcut('s', this.$t('shortcuts.toggleSidebar'), this.toggleSidebar);

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
    beforeUnmount() {
        this.dialogLoaders.forEach(({ name, loader }) => {
            unregisterDialogLoader(name, loader);
        });
        this.dialogLoaders = [];
        unregisterShortcut('s');
        if (this.sidebarFrame) cancelAnimationFrame(this.sidebarFrame);
        if (this.sidebarMediaQuery) {
            this.sidebarMediaQuery.removeEventListener('change', this.handleSidebarBreakpoint);
        }
    },
    methods: {
        prepareDashboard() {
            if (this.isLoaded) return;
            if (window.matchMedia('(max-width: 768px)').matches) {
                this.$store.commit('setSidebarOpen', false);
            }

            this.isLoaded = true;
            this.sidebarFrame = requestAnimationFrame(() => {
                this.sidebarReady = true;
                this.sidebarFrame = null;
            });
        },
        openGearRoom() {
            this.$store.commit('setGearRoomOpen', true);
            if (this.sidebarMediaQuery && this.sidebarMediaQuery.matches) {
                this.$store.commit('setSidebarOpen', false);
            }
        },
        async loadDialog(componentName, loader) {
            if (this.loadedDialogs.some(dialog => dialog.name === componentName)) return;
            const module = await loader();
            this.loadedDialogs.push({ name: componentName, component: module.default || module });
            await this.$nextTick();
        },
        handleSidebarBreakpoint(event) {
            if (event.matches) {
                this._sidebarWasOpen = this.library && this.library.showSidebar;
                if (this._sidebarWasOpen) {
                    this.$store.commit('setSidebarOpen', false);
                }
            } else {
                if (this._sidebarWasOpen) {
                    this.$store.commit('setSidebarOpen', true);
                }
                this._sidebarWasOpen = false;
            }
        },
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
                .catch((err) => { this.verifyResendError = this.translateServerError((err && err.message) || 'An error occurred, please try again later.'); });
        },
        translateServerError(message) {
            const serverMessageKeys = {
                'Too many requests. Try again in 1 hour.': 'misc.alertTooManyRequests',
                'Please wait 5 minutes before requesting another verification email.': 'misc.alertVerifyEmailCooldown',
                'Verification email could not be sent. Please try again later.': 'misc.alertVerificationEmailFailed',
                'An error occurred, please try again later.': 'misc.alertTryAgainLater',
            };
            return serverMessageKeys[message] ? this.$t(serverMessageKeys[message]) : message;
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
