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
            <h3>{{ userToInspect.username }}</h3>
            <div class="lpModerationRow">
                <button class="lpButton lpSmall" @click="clearSession(userToInspect)">
                    {{ $t('community.moderationClearSession') }}
                </button>
                <button class="lpButton lpSmall" @click="resetPassword(userToInspect)">
                    {{ $t('community.moderationResetPassword') }}
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
    </section>
</template>

<script>
import { fetchJson } from '../utils/utils.js';
import { planLabel } from '../services/tier-labels.js';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

export default {
    name: 'CommunityAccounts',
    data() {
        return {
            searchQuery: '',
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
