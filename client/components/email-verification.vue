<style lang="scss">
@import "../css/_globals";

.accountEmailStatus {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: $spacingSmall $spacingMedium;
    min-height: 38px;
}

.accountEmailState {
    font-size: $fontSize-base;
    font-weight: $fontWeight-bold;

    &.accountEmailStateVerified {
        color: $color-accent-text;
    }
}

.accountEmailResend {
    background: transparent;
    border: 1px solid $color-accent;
    border-radius: $radius-sm;
    color: $color-accent-text;
    cursor: pointer;
    font-size: $fontSize-sm;
    min-height: 32px;
    padding: 4px 12px;

    &:disabled {
        cursor: default;
        opacity: 0.6;
    }
}

.accountEmailMessage {
    color: $color-text-muted;
    font-size: $fontSize-sm;
    width: 100%;
}
</style>

<template>
    <div v-if="emailVerified !== null" class="accountField accountEmailField">
        <span class="accountFieldLabel">{{ $t('acct.emailLabel') }}</span>
        <div class="accountEmailStatus">
            <span v-if="emailVerified" class="accountEmailState accountEmailStateVerified">{{ $t('acct.emailVerified') }}</span>
            <template v-else>
                <span class="accountEmailState">{{ $t('acct.emailNotVerified') }}</span>
                <button type="button" class="accountEmailResend" :disabled="sending || sent" @click="resend">
                    {{ sent ? $t('dash.verificationEmailSent') : $t('dash.resendEmail') }}
                </button>
                <span v-if="error" class="accountEmailMessage" role="alert">{{ error }}</span>
            </template>
        </div>
    </div>
</template>

<script>
import { fetchJson } from '../utils/utils';

// The server answers with an English sentence; map the ones a person can act on.
const SERVER_MESSAGE_KEYS = {
    'Too many requests. Try again in 1 hour.': 'misc.alertTooManyRequests',
    'Please wait 5 minutes before requesting another verification email.': 'misc.alertVerifyEmailCooldown',
    'Verification email could not be sent. Please try again later.': 'misc.alertVerificationEmailFailed',
    'An error occurred, please try again later.': 'misc.alertTryAgainLater',
};

export default {
    name: 'EmailVerification',
    data() {
        return {
            sending: false,
            sent: false,
            error: '',
        };
    },
    computed: {
        emailVerified() {
            return this.$store.state.emailVerified;
        },
    },
    methods: {
        resend() {
            this.error = '';
            this.sending = true;
            fetchJson('/resendVerification', { method: 'POST', credentials: 'same-origin' })
                .then(() => { this.sent = true; })
                .catch((err) => {
                    const message = (err && err.message) || 'An error occurred, please try again later.';
                    this.error = SERVER_MESSAGE_KEYS[message] ? this.$t(SERVER_MESSAGE_KEYS[message]) : message;
                })
                .finally(() => { this.sending = false; });
        },
    },
};
</script>
