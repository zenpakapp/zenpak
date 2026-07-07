<style lang="scss">
#resetPassword {
    width: 420px;
}
</style>

<template>
    <div id="resetPasswordContainer">
        <modal id="resetPassword" :shown="true" :blackout="true">
            <h3>{{ $t('auth.resetPasswordTitle') }}</h3>

            <div v-if="success">
                <p>{{ $t('auth.passwordUpdated') }} <router-link to="/welcome" class="lpHref">{{ $t('auth.signIn') }} →</router-link></p>
            </div>
            <div v-else-if="!token">
                <p>{{ $t('auth.invalidResetLink') }} <router-link to="/forgot-password" class="lpHref">{{ $t('auth.requestNewResetLink') }} →</router-link></p>
            </div>
            <div v-else>
                <form @submit.prevent="submit">
                    <div class="lpFields">
                        <input v-model="password" type="password" :placeholder="$t('auth.newPasswordPlaceholder')" autocomplete="new-password">
                        <input v-model="confirm" type="password" :placeholder="$t('auth.confirmPasswordPlaceholder')" autocomplete="new-password">
                        <input type="submit" :value="$t('auth.setNewPassword')" class="lpButton" :disabled="loading">
                    </div>
                    <errors :errors="errors" />
                </form>
            </div>
        </modal>
        <blackoutFooter />
    </div>
</template>

<script>
import blackoutFooter from '../components/blackout-footer.vue';
import errors from '../components/errors.vue';
import modal from '../components/modal.vue';
import { fetchJson } from '../utils/utils';

export default {
    name: 'ResetPassword',
    components: { blackoutFooter, errors, modal },
    data() {
        return {
            token: new URLSearchParams(window.location.search).get('token') || '',
            password: '',
            confirm: '',
            loading: false,
            success: false,
            errors: [],
        };
    },
    methods: {
        async submit() {
            this.errors = [];
            if (this.password.length < 6) {
                this.errors = [{ message: this.$t('auth.passwordMinLength') }];
                return;
            }
            if (this.password !== this.confirm) {
                this.errors = [{ message: this.$t('auth.passwordsDoNotMatch') }];
                return;
            }
            this.loading = true;
            try {
                await fetchJson('/resetPassword', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token: this.token, password: this.password }),
                });
                this.success = true;
            } catch (e) {
                this.errors = (e.json && e.json.errors) || [{ message: this.$t('auth.resetPasswordError') }];
            } finally {
                this.loading = false;
            }
        },
    },
};
</script>
