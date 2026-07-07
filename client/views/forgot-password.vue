<style lang="scss">

#forgotPassword {
    width: 620px;
}

</style>

<template>
    <div id="forgotPasswordContainer">
        <modal id="forgotPassword" :shown="true" :blackout="true">
            <div class="columns">
                <div class="lpHalf">
                    <h3>
                        {{ $t('auth.forgotPasswordTitle') }}
                    </h3>

                    <div v-if="forgotPasswordSent">
                        <p>{{ $t('auth.forgotPasswordCheckEmail') }}</p>
                    </div>
                    <div v-else>
                        <p>{{ $t('auth.forgotPasswordEnterUsername') }}</p>
                        <form class="forgotPassword" @submit.prevent="resetPassword">
                            <div class="lpFields">
                                <input v-model="forgotPasswordUsername" type="text" :placeholder="$t('auth.username')" name="username" class="username">
                                <input type="submit" :value="$t('auth.forgotPasswordSubmit')" class="lpButton">
                            </div>

                            <errors :errors="forgotPasswordErrors" />
                        </form>
                    </div>
                </div>
                <div class="lpHalf">
                    <h3>
                        {{ $t('auth.forgotUsernameTitle') }}
                    </h3>

                    <div v-if="forgotUsernameSent">
                        <p>{{ $t('auth.forgotUsernameCheckInbox') }}</p>
                    </div>
                    <div v-else>
                        <p>{{ $t('auth.forgotUsernameEnterEmail') }}</p>
                        <form class="forgotUsername" @submit.prevent="forgotUsername">
                            <div class="lpFields">
                                <input v-model="forgotUsernameEmail" type="text" :placeholder="$t('auth.email')" name="email" class="email">
                                <input type="submit" :value="$t('auth.forgotPasswordSubmit')" class="lpButton">
                            </div>

                            <errors :errors="forgotUsernameErrors" />
                        </form>
                    </div>
                </div>
                <router-link to="/signin" class="lpHref">
                    &larr; {{ $t('auth.backToSignIn') }}
                </router-link>
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
    name: 'ForgotPassword',
    components: {
        blackoutFooter,
        errors,
        modal,
    },
    data() {
        return {
            forgotPasswordUsername: '',
            forgotPasswordErrors: [],
            forgotPasswordSent: false,
            forgotUsernameEmail: '',
            forgotUsernameErrors: [],
            forgotUsernameSent: false,
        };
    },
    methods: {
        resetPassword() {
            this.forgotPasswordErrors = [];

            return fetchJson('/forgotPassword', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'same-origin',
                body: JSON.stringify({ username: this.forgotPasswordUsername }),
            })
                .then(() => {
                    this.forgotPasswordSent = true;
                })
                .catch((err) => {
                    this.forgotPasswordErrors = err.errors || [{ message: err.message || 'An error occurred, please try again later.' }];
                });
        },
        forgotUsername() {
            this.forgotUsernameErrors = [];

            return fetchJson('/forgotUsername', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'same-origin',
                body: JSON.stringify({ email: this.forgotUsernameEmail }),
            })
                .then(() => {
                    this.forgotUsernameSent = true;
                })
                .catch((err) => {
                    this.forgotUsernameErrors = err.errors || [{ message: err.message || 'An error occurred, please try again later.' }];
                });
        },
    },
};
</script>
