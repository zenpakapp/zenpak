<style lang="scss">
#deleteAccount {
    width: 400px;
}
</style>

<template>
    <modal id="deleteAccount" :shown="shown" @hide="shown = false">
        <h2>{{ $t('acct.deleteAccountTitle') }}</h2>

        <form id="accountForm" @submit.prevent="deleteAccount()">
            <p class="lpWarning">
                <strong>{{ $t('acct.deleteAccountPermanent') }}</strong>
            </p>
            <p v-html="$t('acct.deleteAccountInstructions')"></p>
            <div class="lpFields">
                <input v-model="currentPassword" type="password" :placeholder="$t('acct.currentPassword')" name="currentPassword" class="currentPassword">

                <input v-model="confirmationText" type="text" name="confirmationText" :placeholder="$t('acct.confirmationText')">
            </div>

            <errors :errors="errors" />

            <div class="lpButtons">
                <input type="submit" :value="$t('acct.permanentlyDelete')" :class="{'lpButton': true, 'lpButtonDisabled': !isConfirmationComplete}">
                <a class="lpHref" @click="shown = false">{{ $t('acct.cancel') }}</a>
            </div>
        </form>
    </modal>
</template>

<script>
import errors from './errors.vue';
import modal from './modal.vue';
import { registerDialogOpener, unregisterDialogOpener } from '../services/dialogs';
import { fetchJson } from '../utils/utils';

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
        });
    },
    beforeUnmount() {
        unregisterDialogOpener('deleteAccount');
    },
    methods: {
        deleteAccount() {
            this.errors = [];

            if (!this.currentPassword) {
                this.errors.push({ field: 'currentPassword', message: 'Please enter your current password.' });
            }

            if (!this.isConfirmationComplete) {
                this.errors.push({ field: 'confirmationText', message: 'Please enter the confirmation text.' });
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
                    this.$router.push('/welcome');
                })
                .catch((err) => {
                    this.errors = err;
                    this.deleting = false;
                });
        },
    },
};
</script>
