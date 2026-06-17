<style lang="scss">
#resetPassword {
    width: 420px;
}
</style>

<template>
    <div id="resetPasswordContainer">
        <modal id="resetPassword" :shown="true" :blackout="true">
            <h3>Reset your password</h3>

            <div v-if="success">
                <p>Password updated. <router-link to="/welcome" class="lpHref">Sign in →</router-link></p>
            </div>
            <div v-else-if="!token">
                <p>Invalid reset link. <router-link to="/forgot-password" class="lpHref">Request a new one →</router-link></p>
            </div>
            <div v-else>
                <form @submit.prevent="submit">
                    <div class="lpFields">
                        <input v-model="password" type="password" placeholder="New password (min 6 chars)" autocomplete="new-password">
                        <input v-model="confirm" type="password" placeholder="Confirm new password" autocomplete="new-password">
                        <input type="submit" value="Set new password" class="lpButton" :disabled="loading">
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
                this.errors = [{ message: 'Password must be at least 6 characters.' }];
                return;
            }
            if (this.password !== this.confirm) {
                this.errors = [{ message: 'Passwords do not match.' }];
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
                this.errors = (e.json && e.json.errors) || [{ message: 'An error occurred, please try again.' }];
            } finally {
                this.loading = false;
            }
        },
    },
};
</script>
