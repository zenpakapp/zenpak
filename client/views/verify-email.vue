<style lang="scss">
@import "../css/_globals";

#verifyEmail {
    max-width: 400px;
    text-align: center;

    h2 {
        text-align: center;
    }
}

.lpVerifyIcon {
    font-size: 40px;
    line-height: 1;
    margin-bottom: 12px;
}

.lpVerifyMessage {
    color: $color-text-muted;
    font-size: $fontSize-base;
    line-height: 1.6;
    margin: 0 0 24px;
}

.lpVerifyError {
    color: $color-danger;
    font-size: $fontSize-base;
    margin-top: 12px;
}
</style>

<template>
    <div id="verifyEmailContainer">
        <modal id="verifyEmail" :shown="true" :blackout="true">
            <template v-if="status === 'success'">
                <div class="lpVerifyIcon" style="color: var(--color-accent);">✓</div>
                <h2>{{ $t('auth.emailVerifiedTitle') }}</h2>
                <p class="lpVerifyMessage">{{ $t('auth.emailVerifiedMessage') }}</p>
                <div class="lpButtons">
                    <button class="lpButton" @click="goToPack">{{ $t('auth.backToMyPack') }}</button>
                </div>
            </template>
            <template v-else-if="status === 'error'">
                <div class="lpVerifyIcon" style="color: var(--color-danger);">✗</div>
                <h2>{{ $t('auth.linkExpiredTitle') }}</h2>
                <p class="lpVerifyMessage">{{ $t('auth.linkExpiredMessage') }}</p>
                <div class="lpButtons">
                    <template v-if="alreadyVerified">
                        <button class="lpButton lpButtonSecondary" @click="goToPack">{{ $t('auth.alreadyVerified') }}</button>
                    </template>
                    <template v-else-if="resendSent">
                        <p class="lpVerifyMessage" style="margin:0 0 16px;">{{ $t('auth.newLinkSent') }}</p>
                        <button class="lpButton lpButtonSecondary" @click="goToPack">{{ $t('auth.backToMyPack') }}</button>
                    </template>
                    <template v-else>
                        <button class="lpButton" @click="resend">{{ $t('auth.sendNewLink') }}</button>
                        <button class="lpButton lpButtonSecondary" @click="goToPack">{{ $t('auth.backToMyPack') }}</button>
                    </template>
                </div>
                <p v-if="resendError" class="lpVerifyError">{{ resendError }}</p>
            </template>
            <template v-else>
                <div class="lpVerifyIcon" style="color: var(--color-accent);">✉</div>
                <h2>{{ $t('auth.checkInboxTitle') }}</h2>
                <p class="lpVerifyMessage">{{ $t('auth.checkInboxMessage') }}</p>
                <div class="lpButtons">
                    <button class="lpButton lpButtonSecondary" @click="goToPack">{{ $t('auth.backToMyPack') }}</button>
                </div>
            </template>
        </modal>
        <blackoutFooter />
    </div>
</template>

<script>
import modal from '../components/modal.vue';
import blackoutFooter from '../components/blackout-footer.vue';
import { fetchJson } from '../utils/utils.js';

export default {
    name: 'VerifyEmail',
    components: { modal, blackoutFooter },
    data() {
        return { resendSent: false, resendError: null, alreadyVerified: false };
    },
    computed: {
        status() {
            const q = this.$route.query;
            if (q.success) return 'success';
            if (q.error) return 'error';
            return null;
        },
    },
    mounted() {
        document.title = 'Verify your email — ZenPak';
    },
    methods: {
        goToPack() {
            window.location.href = '/';
        },
        resend() {
            this.resendError = null;
            fetchJson('/resendVerification', { method: 'POST', credentials: 'same-origin' })
                .then((res) => {
                    if (res && res.alreadyVerified) {
                        this.alreadyVerified = true;
                    } else {
                        this.resendSent = true;
                    }
                })
                .catch((err) => { this.resendError = (err && err.message) || this.$t('auth.verifyEmailError'); });
        },
    },
};
</script>
