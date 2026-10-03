<style lang="scss">
@import "../css/_globals";

.lpGlobalAlerts {
    background: $color-warning;
    border: 1px solid rgba(0, 0, 0, 0.15);
    border-radius: 0 0 10px 10px;
    border-top: none;
    color: #1a1a1a;
    left: 50%;
    margin: 0;
    padding: 0;
    position: fixed;
    text-align: center;
    top: 0;
    transform: translateX(-50%);
    width: 50%;
    z-index: $aboveDialog;
}

.lpGlobalAlert {
    align-items: center;
    border-bottom: 1px solid rgba(0, 0, 0, 0.12);
    display: flex;
    gap: $spacingSmall;
    justify-content: space-between;
    list-style-type: none;
    margin: 0;
    padding: $spacingMedium;

    &:last-child {
        border-bottom: none;
    }
}

.lpGlobalAlertMessage {
    flex: 1;
}

.lpGlobalAlertDismiss {
    background: transparent;
    border: 0;
    color: #1a1a1a;
    cursor: pointer;
    font-size: 16px;
    line-height: 1;
    opacity: 0.6;
    padding: 0;

    &:hover { opacity: 1; }
}

.lpGlobalAlertAction {
    background: transparent;
    border: 1px solid currentColor;
    border-radius: 4px;
    color: inherit;
    cursor: pointer;
    font-size: 13px;
    margin-left: 12px;
    padding: 4px 10px;

    &:hover { opacity: 0.75; }
}
</style>

<template>
    <ul v-if="alerts && alerts.length" class="lpGlobalAlerts">
        <li v-for="alert in alerts" :key="alert.id || alert.message" class="lpGlobalAlert">
            <span class="lpGlobalAlertMessage">{{ displayMessage(alert) }}</span>
            <button v-if="isVerifyEmailAlert(alert)" class="lpGlobalAlertAction" type="button" @click="resendVerification(alert)">
                {{ resendLabel(alert) }}
            </button>
            <button class="lpGlobalAlertDismiss" type="button" aria-label="Dismiss alert" @click="dismiss(alert.id)">
                ×
            </button>
        </li>
    </ul>
</template>

<script>
import { fetchJson } from '../utils/utils';

const AUTO_DISMISS_MS = 6000;

export default {
    name: 'GlobalAlerts',
    data() {
        return {
            dismissTimers: {},
        };
    },
    computed: {
        alerts() {
            return this.$store.state.globalAlerts;
        },
    },
    watch: {
        alerts: {
            handler(alerts) {
                this.syncDismissTimers(alerts || []);
            },
            immediate: true,
            deep: true,
        },
    },
    beforeUnmount() {
        Object.values(this.dismissTimers).forEach(clearTimeout);
        this.dismissTimers = {};
    },
    methods: {
        displayMessage(alert) {
            if (alert.key) return this.$t(alert.key, this.resolveParams(alert.params));

            const message = alert.message && alert.message.message
                ? alert.message.message
                : alert.message;

            const serverMessageKeys = {
                'Too many attempts. Try again in 15 minutes.': 'misc.alertTooManyAttempts',
                'Too many requests. Try again in 1 hour.': 'misc.alertTooManyRequests',
                'Please log in.': 'misc.alertPleaseLogIn',
                'Please log in again.': 'misc.alertPleaseLogInAgain',
                'Invalid username and/or password.': 'misc.alertInvalidCredentials',
                'An error occurred, please try again later.': 'misc.alertTryAgainLater',
                'An error occurred while loading your data.': 'misc.alertLoadingData',
                'An error occurred while attempting to save your data.': 'misc.alertSavingData',
                'An error occurred while saving your data. Please refresh your browser and try again.': 'misc.alertRefreshAndTryAgain',
                'An error occurred while saving your data. Please refresh your browser and login again.': 'misc.alertRefreshAndLoginAgain',
                'Your list is out of date - please refresh your browser.': 'misc.alertListOutOfDate',
                'Please verify your email before making lists public.': 'misc.alertVerifyEmailBeforePublic',
                'Please wait 5 minutes before requesting another verification email.': 'misc.alertVerifyEmailCooldown',
                'Verification email could not be sent. Please try again later.': 'misc.alertVerificationEmailFailed',
            };

            return serverMessageKeys[message] ? this.$t(serverMessageKeys[message]) : message;
        },
        messageText(alert) {
            return alert.message && alert.message.message
                ? alert.message.message
                : alert.message;
        },
        isVerifyEmailAlert(alert) {
            return this.messageText(alert) === 'Please verify your email before making lists public.';
        },
        isErrorLikeAlert(alert) {
            const level = alert && (alert.level || alert.type || alert.variant || alert.status);
            if (level && ['warning', 'warn', 'error', 'danger'].includes(String(level))) return true;
            const message = this.messageText(alert) || '';
            if (this.isVerifyEmailAlert(alert)) return true;
            if (message.startsWith('An error occurred')) return true;
            if (message.startsWith('Too many')) return true;
            if (message.startsWith('Please log in')) return true;
            if (message.startsWith('Invalid username')) return true;
            if (message.startsWith('Your list is out of date')) return true;
            if (message.includes('could not') || message.includes('Unable to')) return true;
            return false;
        },
        shouldAutoDismiss(alert) {
            const level = alert && (alert.level || alert.type || alert.variant || alert.status);
            if (level && ['success', 'info'].includes(String(level))) return true;
            return !this.isErrorLikeAlert(alert);
        },
        syncDismissTimers(alerts) {
            const activeIds = new Set(alerts.map((alert) => alert.id).filter(Boolean));
            Object.keys(this.dismissTimers).forEach((id) => {
                if (!activeIds.has(id)) {
                    clearTimeout(this.dismissTimers[id]);
                    delete this.dismissTimers[id];
                }
            });

            alerts.forEach((alert) => {
                if (!alert.id || this.dismissTimers[alert.id] || !this.shouldAutoDismiss(alert)) return;
                this.dismissTimers[alert.id] = setTimeout(() => {
                    this.dismiss(alert.id);
                }, AUTO_DISMISS_MS);
            });
        },
        resendLabel(alert) {
            if (alert.resendSent) return this.$t('dash.verificationEmailSent');
            return this.$t('dash.resendEmail');
        },
        resendVerification(alert) {
            fetchJson('/resendVerification', { method: 'POST', credentials: 'same-origin' })
                .then(() => { alert.resendSent = true; })
                .catch((err) => {
                    alert.message = (err && err.message) || this.$t('misc.alertTryAgainLater');
                });
        },
        resolveParams(params) {
            const resolved = { ...(params || {}) };
            Object.keys(resolved).forEach((key) => {
                if (key.endsWith('Key')) {
                    resolved[key.slice(0, -3)] = this.$t(resolved[key]);
                }
            });
            return resolved;
        },
        dismiss(alertId) {
            if (this.dismissTimers[alertId]) {
                clearTimeout(this.dismissTimers[alertId]);
                delete this.dismissTimers[alertId];
            }
            this.$store.commit('removeGlobalAlert', alertId);
        },
    },
};
</script>
