<template>
    <form class="signin" @submit.prevent="signin">
        <p v-if="message" class="lpSuccess">
            {{ message }}
        </p>
        <div class="lpFields">
            <input v-model="username" v-focus-on-create type="text" :placeholder="$t('auth.username')" name="username" class="username">
            <input ref="passwordInput" v-model="password" type="password" :placeholder="$t('auth.password')" name="password" class="password">
        </div>

        <errors :errors="errors" />

        <div class="lpButtons">
            <button class="lpButton">
                {{ $t('auth.signIn') }}
                <spinner v-if="fetching" />
            </button>

            <router-link to="/forgot-password" class="lpHref signin-forgot-password">
                {{ $t('auth.forgotUsernamePassword') }}
            </router-link>
        </div>
    </form>
</template>

<script>
import errors from './errors.vue';
import spinner from './spinner.vue';
import { fetchJson } from '../utils/utils';

export default {
    name: 'SigninForm',
    components: {
        errors,
        spinner,
    },
    props: ['message'],
    data() {
        return {
            fetching: false,
            errors: [],
            username: '',
            password: '',
        };
    },
    methods: {
        signin() {
            this.errors = [];

            if (!this.username) {
                this.errors.push({ field: 'username', message: this.$t('auth.usernameRequired') });
            }

            if (!this.password) {
                this.errors.push({ field: 'password', message: this.$t('auth.passwordRequired') });
            }

            if (this.errors.length) {
                return;
            }

            this.fetching = true; // ho ho

            return fetchJson('/signin/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'same-origin',
                body: JSON.stringify({ username: this.username, password: this.password }),
            })
                .then((response) => {
                    this.$store.commit('setSyncToken', response.syncToken);
                    this.$store.commit('loadLibraryData', response.library);
                    this.$store.commit('setSaveType', 'remote');
                    this.$store.commit('setLoggedIn', response.username);
                    const redirect = this.$route.query.redirect;
                    this.$router.push(redirect && redirect.startsWith('/') ? redirect : '/');
                    this.fetching = false;
                })
                .catch((err) => {
                    this.errors = err;
                    this.password = '';
                    this.$nextTick(() => {
                        if (this.$refs.passwordInput) {
                            this.$refs.passwordInput.select();
                        }
                    });
                    this.fetching = false;
                });
        },
    },
};
</script>
