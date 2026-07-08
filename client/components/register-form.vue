<style lang="scss">

</style>

<template>
    <div>
        <template-picker v-if="showTemplatePicker" @select="submitWithTemplate" @dismiss="submitWithTemplate(null)" />
        <form class="lpRegister lpFields" @submit.prevent="submit">
            <div class="lpFields">
                <input v-model="username" v-focus-on-create type="text" :placeholder="$t('auth.username')" name="username">
                <input v-model="email" type="email" :placeholder="$t('auth.email')" name="email">
                <input v-model="password" type="password" :placeholder="$t('auth.password')" name="password">
                <input v-model="passwordConfirm" type="password" :placeholder="$t('auth.confirmPassword')" name="passwordConfirm">
            </div>
            <errors :errors="errors" />
            <div class="lpButtons">
                <button class="lpButton">
                    {{ $t('auth.register') }}
                    <spinner v-if="saving" />
                </button>
                <a href="" class="lpHref lpGetStarted" @click.prevent="loadLocal">{{ $t('auth.skipForNow') }}</a>
            </div>
        </form>
    </div>
</template>

<script>
import errors from './errors.vue';
import spinner from './spinner.vue';
import templatePicker from './template-picker.vue';
import { push } from '../services/navigation';
import { getLocalLibrary, hasLocalLibrary, moveLocalLibraryToRegistered } from '../services/browser-storage';
import { fetchJson } from '../utils/utils';

const dataTypes = require('../dataTypes.js');

const Library = dataTypes.Library;

export default {
    name: 'RegisterForm',
    components: {
        errors,
        spinner,
        templatePicker,
    },
    data() {
        return {
            username: '',
            email: '',
            password: '',
            passwordConfirm: '',
            saving: false,
            errors: [],
            showTemplatePicker: false,
            pendingRegisterData: null,
        };
    },
    computed: {
        isLocalSaving() {
            return this.$store.state.saveType === 'local';
        },
    },
    methods: {
        loadLocal() {
            if (this.isLocalSaving) {
                push('/');
                return;
            }
            this.pendingRegisterData = { localMode: true };
            this.showTemplatePicker = true;
        },
        loadLocalWithTemplate(templateData) {
            this.showTemplatePicker = false;
            this.pendingRegisterData = null;
            const library = new Library();
            if (templateData) {
                this.$store.commit('loadLibraryData', JSON.stringify(templateData));
            } else {
                this.$store.commit('loadLibraryData', JSON.stringify(library.save()));
            }
            this.$store.commit('setSaveType', 'local');
            this.$store.commit('setLoggedIn', false);
            push('/');
        },
        submit() {
            this.errors = [];

            if (!this.username) {
                this.errors.push({ field: 'username', message: this.$t('auth.usernameRequired') });
            }

            if (this.username && (this.username.length < 3 || this.username.length > 32)) {
                this.errors.push({ field: 'username', message: this.$t('auth.usernameLengthError') });
            }

            if (!this.email) {
                this.errors.push({ field: 'email', message: this.$t('auth.emailRequired') });
            }

            if (!this.password) {
                this.errors.push({ field: 'password', message: this.$t('auth.passwordRequired') });
            }

            if (!this.passwordConfirm) {
                this.errors.push({ field: 'passwordConfirm', message: this.$t('auth.passwordConfirmRequired') });
            }

            if (this.password && this.passwordConfirm && this.password !== this.passwordConfirm) {
                this.errors.push({ field: 'password', message: this.$t('auth.passwordsDoNotMatch') });
            }

            if (this.password && (this.password.length < 5 || this.password.length > 60)) {
                this.errors.push({ field: 'password', message: this.$t('auth.passwordLengthError') });
            }

            if (this.errors.length) {
                return;
            }

            const registerData = { username: this.username, email: this.email, password: this.password };

            if (hasLocalLibrary()) {
                registerData.library = getLocalLibrary();
            }

            this.pendingRegisterData = registerData;
            this.showTemplatePicker = true;
        },
        submitWithTemplate(templateData) {
            if (this.pendingRegisterData && this.pendingRegisterData.localMode) {
                this.loadLocalWithTemplate(templateData);
                return;
            }

            this.showTemplatePicker = false;
            const registerData = this.pendingRegisterData;
            this.pendingRegisterData = null;

            if (templateData !== null) {
                registerData.library = JSON.stringify(templateData);
            }

            this.saving = true;
            return fetchJson('/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'same-origin',
                body: JSON.stringify(registerData),
            })
                .then((response) => {
                    this.$store.commit('setSyncToken', response.syncToken);
                    this.$store.commit('loadLibraryData', response.library);
                    this.$store.commit('setSaveType', 'remote');
                    this.$store.commit('setLoggedIn', response.username);
                    this.$store.commit('setEmailVerified', response.emailVerified ?? false);

                    if (registerData.library) {
                        moveLocalLibraryToRegistered();
                    }
                    this.saving = false;
                    this.$store.commit('pushGlobalAlert', { message: this.$t('auth.welcomeCheckEmail') });
                    push('/');
                })
                .catch((err) => {
                    this.saving = false;
                    this.errors = err;
                });
        },
    },
};
</script>
