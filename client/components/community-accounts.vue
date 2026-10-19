<template>
    <section class="lpModerationAccounts">
        <h2 class="lpModerationHeading">
            {{ $t('community.moderationAccounts') }}
        </h2>
        <form class="lpModerationSearch" @submit.prevent="searchUsers">
            <input
                v-model="searchQuery"
                class="lpCommunitySearchInput lp-moderation-search"
                type="text"
                :placeholder="$t('community.moderationSearchUserPlaceholder')"
            >
            <button class="lpButton lpSmall">
                {{ $t('community.moderationSearchButton') }}
            </button>
        </form>
        <p v-if="error" class="lpCommunityEmpty lp-moderation-error">
            {{ error }}
        </p>
        <ul v-if="searchResults" class="lpModerationResults lp-moderation-search-results">
            <li v-for="result in searchResults" :key="result.username">
                <button type="button" @click="setUser(result)">
                    {{ result.username }}
                </button>
            </li>
        </ul>

        <div v-if="userToInspect" class="lpModerationAccount">
            <h3>
                {{ userToInspect.username }}
                <span v-if="userToInspect.banned" class="lpCommunityBadge lp-moderation-banned">{{ $t('community.moderationBanned') }}</span>
            </h3>
            <div class="lpModerationRow">
                <button class="lpButton lpSmall" @click="clearSession(userToInspect)">
                    {{ $t('community.moderationClearSession') }}
                </button>
                <button class="lpButton lpSmall" @click="resetPassword(userToInspect)">
                    {{ $t('community.moderationResetPassword') }}
                </button>
                <button
                    v-if="!userToInspect.banned"
                    class="lpButton lpSmall lpButtonDanger lp-moderation-ban-account"
                    @click="pendingBan = userToInspect"
                >
                    {{ $t('community.moderationBan') }}
                </button>
                <button v-else class="lpButton lpSmall lp-moderation-unban-account" @click="unbanAccount(userToInspect)">
                    {{ $t('community.moderationUnban') }}
                </button>
                <template v-if="newPassword">
                    <strong>{{ $t('community.moderationNewPassword') }}</strong> {{ newPassword }}
                </template>
            </div>
            <div class="lpModerationOffer lp-moderation-offer">
                <h4>{{ $t('community.moderationOfferTitle') }}</h4>
                <p v-if="userToInspect.offer" class="lp-moderation-offer-current">
                    {{ $t('community.moderationOfferCurrent', { plan: planName(userToInspect.offer.plan), date: formatDate(userToInspect.offer.currentPeriodEnd) }) }}
                    <button class="lpButton lpSmall lpButtonDanger lp-moderation-offer-revoke" @click="revokeOffer(userToInspect)">
                        {{ $t('community.moderationOfferRevoke') }}
                    </button>
                </p>
                <label>
                    {{ $t('community.moderationOfferPlan') }}
                    <select v-model="offerPlanName" class="lp-moderation-offer-plan">
                        <option value="creator">Wayfarer</option>
                        <option value="supporter">Kin</option>
                    </select>
                </label>
                <label>
                    {{ $t('community.moderationOfferMonths') }}
                    <input v-model.number="offerMonths" type="number" min="1" max="12" class="lp-moderation-offer-months">
                </label>
                <button class="lpButton lpSmall lp-moderation-offer-submit" @click="offerPlan(userToInspect)">
                    {{ $t('community.moderationOfferButton') }}
                </button>
                <p v-if="offerResult" class="lp-moderation-offer-result">
                    {{ offerResult }}
                </p>
                <p v-if="offerError" class="lp-moderation-offer-error">
                    {{ offerError }}
                </p>
            </div>
            <details class="lpModerationLibraryBox">
                <summary>{{ $t('community.moderationLibrary') }}</summary>
                <textarea v-model="editableLibrary" class="lpModerationLibrary" readonly />
            </details>
        </div>
        <confirm-dialog
            :shown="Boolean(pendingBan)"
            :title="$t('community.moderationConfirmBanTitle', { name: pendingBan ? pendingBan.username : '' })"
            :message="$t('community.moderationConfirmBan')"
            :confirm-label="$t('community.moderationBan')"
            danger
            @confirm="banAccount"
            @cancel="pendingBan = null"
        />
    </section>
</template>

<script>
import { fetchJson } from '../utils/utils';
import ConfirmDialog from './confirm-dialog.vue';
import { planLabel } from '../services/tier-labels';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

export default {
    name: 'CommunityAccounts',
    components: { ConfirmDialog },
    data() {
        return {
            searchQuery: '',
            pendingBan: null,
            searchResults: null,
            userToInspect: null,
            editableLibrary: null,
            newPassword: null,
            offerPlanName: 'creator',
            offerMonths: 3,
            offerResult: null,
            offerError: null,
            error: null,
        };
    },
    methods: {
        searchUsers() {
            this.error = null;
            fetchJson(`/moderation/search?q=${encodeURIComponent(this.searchQuery)}`, {
                method: 'GET',
                credentials: 'same-origin',
            })
                .then((response) => {
                    this.searchResults = response.results;
                })
                .catch(() => {
                    this.error = 'Unable to search users.';
                });
        },
        setUser(user) {
            this.userToInspect = user;
            this.editableLibrary = JSON.stringify(user.library, null, 2);
            this.newPassword = null;
            this.offerResult = null;
            this.offerError = null;
        },
        clearSession(user) {
            this.error = null;
            fetchJson('/moderation/clear-session', {
                method: 'POST',
                credentials: 'same-origin',
                headers: JSON_HEADERS,
                body: JSON.stringify({ username: user.username }),
            })
                .catch(() => {
                    this.error = 'Unable to clear session.';
                });
        },
        // A ban ends the session and hides the account's lists and pages. It can be lifted.
        async banAccount() {
            const user = this.pendingBan;
            this.pendingBan = null;
            if (!user) return;
            this.error = null;
            try {
                await fetchJson(`/api/reports/ban/${encodeURIComponent(user.username)}`, { method: 'POST' });
                user.banned = true;
            } catch (error) {
                const key = `community.moderationBanError_${error.code}`;
                this.error = this.$te(key) ? this.$t(key) : 'Unable to ban user.';
            }
        },
        async unbanAccount(user) {
            this.error = null;
            try {
                await fetchJson(`/api/reports/unban/${encodeURIComponent(user.username)}`, { method: 'POST' });
                user.banned = false;
            } catch {
                this.error = 'Unable to reinstate user.';
            }
        },
        // Gives the account a plan for a few months (a creator invited to the beta). The server
        // refuses an account that pays for a subscription, and says why.
        offerPlan(user) {
            this.offerError = null;
            this.offerResult = null;
            fetchJson('/moderation/offer-plan', {
                method: 'POST',
                credentials: 'same-origin',
                headers: JSON_HEADERS,
                body: JSON.stringify({ username: user.username, plan: this.offerPlanName, months: this.offerMonths }),
            })
                .then((response) => {
                    this.offerResult = this.$t('community.moderationOfferDone', {
                        plan: this.planName(response.plan),
                        date: this.formatDate(response.currentPeriodEnd),
                    });
                    user.offer = { plan: response.plan, currentPeriodEnd: response.currentPeriodEnd };
                })
                .catch((error) => this.showOfferError(error, 'Unable to offer the plan.'));
        },
        // Withdraws the running offer: the account is free again right away.
        revokeOffer(user) {
            this.offerError = null;
            this.offerResult = null;
            fetchJson('/moderation/revoke-offer', {
                method: 'POST',
                credentials: 'same-origin',
                headers: JSON_HEADERS,
                body: JSON.stringify({ username: user.username }),
            })
                .then((response) => {
                    this.offerResult = this.$t('community.moderationOfferRevoked', { plan: this.planName(response.plan) });
                    user.offer = null;
                })
                .catch((error) => this.showOfferError(error, 'Unable to withdraw the offer.'));
        },
        showOfferError(error, fallback) {
            const key = `community.moderationOfferError_${error.code}`;
            this.offerError = this.$te(key) ? this.$t(key) : (error.message || fallback);
        },
        planName(plan) {
            return planLabel(plan);
        },
        formatDate(iso) {
            return new Date(iso).toLocaleDateString(this.$i18n.locale, {
                year: 'numeric', month: 'long', day: 'numeric',
            });
        },
        resetPassword(user) {
            this.error = null;
            fetchJson('/moderation/reset-password', {
                method: 'POST',
                credentials: 'same-origin',
                headers: JSON_HEADERS,
                body: JSON.stringify({ username: user.username }),
            })
                .then((response) => {
                    this.newPassword = response.newPassword;
                })
                .catch(() => {
                    this.error = 'Unable to reset password.';
                });
        },
    },
};
</script>
