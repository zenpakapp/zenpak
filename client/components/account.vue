<style lang="scss">
@import "../css/_account";
</style>

<template>
    <modal id="accountSettings" :shown="shown" @hide="shown = false">
        <h2 class="accountSettingsTitle">{{ $t('acct.accountSettings') }}</h2>

        <section class="accountSection">
            <form id="accountForm" @submit.prevent="updateAccount()">
                <div class="accountFieldGroup">
                    <div class="accountField">
                        <span class="accountFieldLabel">{{ $t('acct.username') }}</span>
                        <input type="text" name="username" class="accountFieldInput" disabled :value="username">
                    </div>
                    <div class="accountField">
                        <span class="accountFieldLabel">{{ $t('acct.currentPassword') }}</span>
                        <input v-model="currentPassword" type="password" class="accountFieldInput" :placeholder="$t('acct.requiredToMakeChanges')" name="currentPassword">
                    </div>

                    <hr class="accountFieldGroupDivider">

                    <div class="accountField">
                        <span class="accountFieldLabel">{{ $t('acct.newEmail') }}</span>
                        <input v-model="newEmail" type="email" class="accountFieldInput" :placeholder="$t('acct.leaveBlankEmail')" name="newEmail">
                    </div>

                    <hr class="accountFieldGroupDivider">

                    <div class="accountField">
                        <span class="accountFieldLabel">{{ $t('acct.newPassword') }}</span>
                        <input v-model="newPassword" type="password" class="accountFieldInput" :placeholder="$t('acct.leaveBlankPassword')" name="newPassword">
                    </div>
                    <div class="accountField">
                        <span class="accountFieldLabel">{{ $t('acct.confirmNewPassword') }}</span>
                        <input v-model="confirmNewPassword" type="password" class="accountFieldInput" :placeholder="$t('acct.repeatNewPassword')" name="confirmNewPassword">
                    </div>
                </div>

                <errors :errors="errors" />

                <div class="accountActions">
                    <button class="lpButton">
                        {{ $t('acct.saveChanges') }}
                        <spinner v-if="saving" />
                    </button>
                    <div class="accountActionsRight">
                        <a class="accountCancelLink" @click="shown = false">{{ $t('acct.cancel') }}</a>
                        <a class="accountDangerLink" @click="showDeleteAccount">{{ $t('acct.deleteAccount') }}</a>
                    </div>
                </div>
            </form>
        </section>

        <section class="accountSection">
            <h3 class="accountSectionTitle">{{ $t('acct.libraryBackup') }}</h3>
            <template v-if="hasBackup">
                <p class="accountSectionText">{{ $t('acct.libraryBackupDesc') }}</p>
                <div class="accountBackupActions">
                    <button class="lpButton" @click="downloadBackup" :disabled="backupLoading">
                        {{ backupLoading ? $t('acct.preparing') : $t('acct.downloadBackup') }}
                    </button>
                    <button class="lpButton lpButtonSecondary" @click="triggerRestoreFile" :disabled="restoreLoading">
                        {{ restoreLoading ? $t('acct.restoring') : $t('acct.restoreFromBackup') }}
                    </button>
                </div>
                <div v-if="restoreConfirm" class="accountRestoreConfirm">
                    <p class="accountRestoreConfirmText">{{ $t('acct.restoreWarning') }}</p>
                    <div class="accountRestoreConfirmActions">
                        <button class="lpButton lpButtonDanger" @click="confirmRestore">{{ $t('acct.yesRestore') }}</button>
                        <a class="accountCancelLink" @click="restoreConfirm = false; restoreFile = null">{{ $t('acct.cancel') }}</a>
                    </div>
                </div>
                <input ref="restoreInput" type="file" accept=".json" style="display:none" @change="onRestoreFile" />
            </template>
        </section>

        <section v-if="billing && billing.stripeEnabled" class="accountSection">
            <h3 class="accountSectionTitle">Subscription</h3>

            <div v-if="billing.status === 'past_due'" class="accountBillingAlert">
                {{ $t('acct.paymentFailed') }}
                <div class="accountActions">
                    <button class="lpButton lpButtonDanger" @click="openPortal()">{{ $t('acct.updatePayment') }}</button>
                </div>
            </div>

            <div v-if="billingError" class="accountBillingError">{{ billingError }}</div>

            <div v-if="billing.plan === 'free'" class="accountBillingUpgrade">
                <p class="accountSectionText">{{ $t('acct.upgradePrompt') }}</p>
                <div class="accountBillingActions">
                    <div class="accountBillingOption">
                        <p class="accountSectionText"><strong>Kin</strong> — {{ $t('acct.kinPrice') }}</p>
                        <button @click="openCheckout('trail')" class="lpButton accountBillingKinBtn">
                            {{ $t('acct.upgradeToKin') }}
                        </button>
                    </div>
                    <div class="accountBillingOption">
                        <p class="accountSectionText"><strong>Wayfarer</strong></p>
                        <div class="accountIntervalToggle">
                            <button
                                :class="['lpButton', selectedGuideInterval === 'month' ? 'lpButtonPrimary' : 'lpButtonSecondary']"
                                @click="selectedGuideInterval = 'month'"
                            >
                                {{ $t('acct.wayfarerMonthPrice') }}
                            </button>
                            <button
                                :class="['lpButton', selectedGuideInterval === 'year' ? 'lpButtonPrimary' : 'lpButtonSecondary']"
                                @click="selectedGuideInterval = 'year'"
                            >
                                {{ $t('acct.wayfarerYearPrice') }}
                            </button>
                        </div>
                        <button
                            @click="openCheckout('guide', selectedGuideInterval)"
                            class="lpButton lpButtonPrimary"
                        >
                            {{ $t('acct.upgradeToWayfarer') }}
                        </button>
                    </div>
                </div>
            </div>

            <div v-if="billing.plan === 'supporter'" class="accountBillingManage">
                <p class="accountSectionText">
                    {{ $t('acct.currentPlan') }}<strong>Kin</strong>
                    <span v-if="billing.cancelAtPeriodEnd">{{ $t('acct.cancels') }}{{ formatDate(billing.currentPeriodEnd) }}</span>
                </p>
                <div class="accountActions">
                    <button class="lpButton lpButtonPrimary" @click="openPortal(billing.subscriptionId)">{{ $t('acct.upgradeToWayfarer') }}</button>
                    <button class="lpButton lpButtonSecondary" @click="openPortal()">{{ $t('acct.manageSubscription') }}</button>
                </div>
            </div>

            <div v-if="billing.plan === 'creator'" class="accountBillingManage">
                <p class="accountSectionText">
                    {{ $t('acct.currentPlan') }}<strong>Wayfarer</strong>
                    <span v-if="billing.cancelAtPeriodEnd">{{ $t('acct.cancels') }}{{ formatDate(billing.currentPeriodEnd) }}</span>
                </p>
                <div class="accountActions">
                    <button class="lpButton lpButtonSecondary" @click="openPortal()">{{ $t('acct.manageSubscription') }}</button>
                </div>
            </div>
        </section>

        <section class="accountSection">
            <h3 class="accountSectionTitle">{{ $t('acct.language') }}</h3>
            <div class="accountField">
                <lp-select :value="selectedLocale" :options="localeOptions" @change="selectLocale" />
            </div>
        </section>

        <profileSettings />
        <creatorLinks />
    </modal>
</template>

<script>
import errors from './errors.vue';
import modal from './modal.vue';
import spinner from './spinner.vue';
import profileSettings from './profile-settings.vue';
import creatorLinks from './creator-links.vue';
import upgradePrompt from './upgrade-prompt.vue';
import LpSelect from './lp-select.vue';
import { openDialog, registerDialogOpener, unregisterDialogOpener } from '../services/dialogs';
import { fetchJson } from '../utils/utils';
import { hasFeature, FEATURES } from '../services/entitlements.js';
import { setLocale } from '../i18n';

export default {
    name: 'Account',
    components: {
        errors,
        modal,
        spinner,
        profileSettings,
        creatorLinks,
        upgradePrompt,
        LpSelect,
    },
    data() {
        return {
            saving: false,
            errors: [],
            currentPassword: '',
            newEmail: '',
            newPassword: '',
            confirmNewPassword: '',
            shown: false,
            backupLoading: false,
            restoreLoading: false,
            restoreConfirm: false,
            restoreFile: null,
            billingError: null,
            selectedGuideInterval: 'month',
            selectedLocale: localStorage.getItem('zp-locale') || 'auto',
        };
    },
    computed: {
        library() {
            return this.$store.state.library;
        },
        username() {
            return this.$store.state.loggedIn;
        },
        hasBackup() {
            return !!this.library;
        },
        billing() {
            return this.$store.state.billing;
        },
        planLabel() {
            const map = { supporter: 'Kin', creator: 'Wayfarer', free: 'Base' };
            return map[this.billing && this.billing.plan] || 'Base';
        },
        localeOptions() {
            return [
                { value: 'auto', label: this.$t('acct.languageAuto') },
                { value: 'en', label: 'English' },
                { value: 'fr', label: 'Français' },
                { value: 'de', label: 'Deutsch' },
                { value: 'es', label: 'Español' },
            ];
        },
    },
    mounted() {
        registerDialogOpener('account', () => {
            this.shown = true;
            fetch('/api/billing/me', { credentials: 'include' })
                .then(r => r.ok ? r.json() : null)
                .then(data => { if (data) this.$store.commit('setBilling', data); })
                .catch(() => {});
        });
    },
    beforeUnmount() {
        unregisterDialogOpener('account');
    },
    methods: {
        selectLocale(val) {
            this.selectedLocale = val;
            this.changeLocale();
        },
        changeLocale() {
            setLocale(this.selectedLocale);
        },
        async downloadBackup() {
            this.backupLoading = true;
            try {
                const res = await fetch('/api/backup', { credentials: 'same-origin' });
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                const cd = res.headers.get('Content-Disposition') || '';
                const match = cd.match(/filename="([^"]+)"/);
                a.href = url;
                a.download = match ? match[1] : 'zenpak-backup.json';
                a.click();
                URL.revokeObjectURL(url);
            } catch {
                // silent — user sees nothing happened
            }
            this.backupLoading = false;
        },
        triggerRestoreFile() {
            this.$refs.restoreInput.value = '';
            this.$refs.restoreInput.click();
        },
        onRestoreFile(event) {
            const file = event.target.files[0];
            if (!file) return;
            this.restoreFile = file;
            this.restoreConfirm = true;
        },
        async confirmRestore() {
            if (!this.restoreFile) return;
            this.restoreConfirm = false;
            this.restoreLoading = true;
            try {
                const text = await this.restoreFile.text();
                const data = JSON.parse(text);
                if (!data.library) throw new Error('Invalid backup file');
                await this.$store.dispatch('restoreFromBackup', data.library);
            } catch {
                // silent on parse/network errors
            }
            this.restoreFile = null;
            this.restoreLoading = false;
        },
        updateAccount() {
            this.errors = [];

            if (!this.currentPassword) {
                this.errors.push({ field: 'currentPassword', message: this.$t('acct.errorCurrentPassword') });
            }

            if (this.newPassword && this.newPassword != this.confirmNewPassword) {
                this.errors.push({ field: 'newPassword', message: this.$t('acct.errorPasswordsNoMatch') });
            }

            if (this.newPassword && (this.newPassword.length < 5 || this.newPassword.length > 60)) {
                this.errors.push({ field: 'newPassword', message: this.$t('acct.errorPasswordLength') });
            }

            if (this.errors.length) {
                return;
            }

            const data = { username: this.username, currentPassword: this.currentPassword };

            let dirty = false;

            if (this.newPassword) {
                dirty = true;
                data.newPassword = this.newPassword;
            }
            if (this.newEmail) {
                dirty = true;
                data.newEmail = this.newEmail;
            }

            if (!dirty) return;

            this.currentPassword = '';
            this.saving = true;

            fetchJson('/account', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'same-origin',
                body: JSON.stringify(data),
            })
                .then((response) => {
                    this.saving = false;
                    this.shown = false;
                })
                .catch((err) => {
                    this.errors = err;
                    this.saving = false;
                });
        },
        showDeleteAccount() {
            this.shown = false;
            openDialog('deleteAccount');
        },
        async openCheckout(plan, interval) {
            this.billingError = null;
            const body = interval ? { plan, interval } : { plan };
            try {
                const res = await fetch('/api/billing/checkout-session', {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                });
                const data = await res.json();
                if (data.url) window.location.href = data.url;
                else this.billingError = 'Something went wrong — give it another try.';
            } catch (_) {
                this.billingError = 'Looks like we lost the connection. Try again in a moment.';
            }
        },
        async openPortal(subscriptionId) {
            this.billingError = null;
            try {
                const body = subscriptionId ? { subscriptionId } : {};
                const res = await fetch('/api/billing/portal-session', {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                });
                const data = await res.json();
                if (data.url) window.location.href = data.url;
                else this.billingError = data.message || 'Something went wrong — give it another try.';
            } catch (_) {
                this.billingError = 'Looks like we lost the connection. Try again in a moment.';
            }
        },
        formatDate(iso) {
            if (!iso) return '';
            return new Date(iso).toLocaleDateString();
        },
    },
};
</script>
