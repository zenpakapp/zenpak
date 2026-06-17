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
                        Forgot Your Password?
                    </h3>

                    <div v-if="forgotPasswordSent">
                        <p>A reset link has been sent to your email.</p>
                    </div>
                    <div v-else>
                        <p>Please enter your username.</p>
                        <form class="forgotPassword" @submit.prevent="resetPassword">
                            <div class="lpFields">
                                <input v-model="forgotPasswordUsername" type="text" placeholder="Username" name="username" class="username">
                                <input type="submit" value="Submit" class="lpButton">
                            </div>

                            <errors :errors="forgotPasswordErrors" />
                        </form>
                    </div>
                </div>
                <div class="lpHalf">
                    <h3>
                        Forgot Your Username?
                    </h3>

                    <div v-if="forgotUsernameSent">
                        <p>If that email is registered, check your mailbox. Your username is on its way.</p>
                    </div>
                    <div v-else>
                        <p>Please enter your email address.</p>
                        <form class="forgotUsername" @submit.prevent="forgotUsername">
                            <div class="lpFields">
                                <input v-model="forgotUsernameEmail" type="text" placeholder="Email Address" name="email" class="email">
                                <input type="submit" value="Submit" class="lpButton">
                            </div>

                            <errors :errors="forgotUsernameErrors" />
                        </form>
                    </div>
                </div>
                <router-link to="/signin" class="lpHref">
                    &larr; Return to sign in
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
