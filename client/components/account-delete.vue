<style lang="scss">
#deleteAccount {
    width: min(400px, calc(100vw - 32px));
}

// The subscription notice sits in the same warning box, under the bold line.
#deleteAccount .lpWarningDetail {
    display: block;
    margin-top: 8px;
}
</style>

<template>
    <modal id="deleteAccount" :shown="shown" @hide="shown = false">
        <h2>{{ $t('acct.deleteAccountTitle') }}</h2>

        <form id="accountForm" @submit.prevent="deleteAccount()">
            <p class="lpWarning">
                <strong>{{ $t('acct.deleteAccountPermanent') }}</strong>
                <span v-if="hasSubscription" class="lpWarningDetail" data-test="subscription-warning">{{ $t('acct.deleteSubscriptionWarning') }}</span>
            </p>
            <p v-html="$t('acct.deleteAccountInstructions')" />
            <div class="lpFields">
                <input v-if="hasPassword" v-model="currentPassword" type="password" :placeholder="$t('acct.currentPassword')" name="currentPassword" class="currentPassword">

                <input v-model="confirmationText" type="text" name="confirmationText" :placeholder="$t('acct.confirmationText')">
            </div>

            <errors :errors="errors" />

            <div class="lpButtons">
                <input type="submit" :value="$t('acct.permanentlyDelete')" :class="{'lpButton': true, 'lpButtonDisabled': !isConfirmationComplete}">
                <a class="lpHref" role="button" tabindex="0" @click="shown = false" @keydown.enter="shown = false" @keydown.space.prevent="shown = false">{{ $t('acct.cancel') }}</a>
            </div>
        </form>
    </modal>
</template>

<script>
import errors from './errors.vue';
import modal from './modal.vue';
import { registerDialogOpener, unregisterDialogOpener } from '../services/dialogs';
import { fetchJson } from '../utils/utils';
import { redirect } from '../services/navigation';

export default {
    name: 'Account',
    components: {
        errors,
        modal,
    },
    data() {
        return {
            deleting: false,
            errors: [],
            confirmationText: '',
            currentPassword: '',
            hasPassword: true,
            hasSubscription: false,
            shown: false,
        };
    },
    computed: {
        isConfirmationComplete() {
            return this.confirmationText.toLocaleLowerCase() === 'delete my account';
        },
    },
    mounted() {
        registerDialogOpener('deleteAccount', () => {
            this.shown = true;
            this.loadAccountState();
        });
    },
    beforeUnmount() {
        unregisterDialogOpener('deleteAccount');
    },
    methods: {
        // A Google account has no password to type: only the confirmation phrase is asked. A paying
        // account is told its subscription ends now, with no refund of the rest of the period.
        async loadAccountState() {
            try {
                const response = await fetchJson('/api/auth/me', { credentials: 'same-origin' });
                this.hasPassword = response.hasPassword !== false;
            } catch (e) {
                this.hasPassword = true;
            }
            try {
                const billing = await fetchJson('/api/billing/me', { credentials: 'same-origin' });
                this.hasSubscription = billing.provider === 'stripe' && Boolean(billing.subscriptionId)
                    && !['free', 'canceled', 'revoked'].includes(billing.status);
            } catch (e) {
                this.hasSubscription = false;
            }
        },
        deleteAccount() {
            this.errors = [];

            if (this.hasPassword && !this.currentPassword) {
                this.errors.push({ field: 'currentPassword', message: this.$t('acct.deletePasswordRequired') });
            }

            if (!this.isConfirmationComplete) {
                this.errors.push({ field: 'confirmationText', message: this.$t('acct.deleteConfirmationRequired') });
            }

            if (this.errors.length) {
                return;
            }

            fetchJson('/delete-account', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'same-origin',
                body: JSON.stringify({ username: this.$store.state.loggedIn, password: this.currentPassword }),
            })
                .then((response) => {
                    this.deleting = false;
                    this.$store.commit('signout');
                    redirect('/welcome');
                })
                .catch((err) => {
                    // The server's own message is English only: this one is translated.
                    this.errors = err && err.code === 'subscription-cancel-failed'
                        ? [{ message: this.$t('acct.deleteSubscriptionCancelFailed') }]
                        : err;
                    this.deleting = false;
                });
        },
    },
};
</script>
