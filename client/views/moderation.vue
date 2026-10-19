<style lang="scss">
@import "../css/_moderation";
</style>

<template>
    <div id="lp-moderation">
        <h1>{{ $t('community.moderationTitle') }}</h1>

        <form @submit.prevent="searchUsers">
            <input v-model="searchQuery" type="text" :placeholder="$t('community.moderationSearchUserPlaceholder')">
            <button>{{ $t('community.moderationSearchButton') }}</button>
        </form>
        <p v-if="error" class="lp-moderation-error">
            {{ error }}
        </p>
        <ul v-if="resultsLoaded" class="lp-moderation-search-results">
            <li v-for="result in searchResults" :key="result.username" @click="setUser(result)">
                {{ result.username }}
            </li>
        </ul>

        <div v-if="userToInspect" class="lp-moderation-user-to-inspect">
            <h2>{{ userToInspect.username }}</h2>
            <section>
                <button @click="clearSession(userToInspect)">
                    {{ $t('community.moderationClearSession') }}
                </button>
                <button @click="resetPassword(userToInspect)">
                    {{ $t('community.moderationResetPassword') }}
                </button>
                <template v-if="newPassword">
                    <strong>{{ $t('community.moderationNewPassword') }}</strong> {{ newPassword }}
                </template>
            </section>
            <section class="lp-moderation-offer">
                <h3>{{ $t('community.moderationOfferTitle') }}</h3>
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
                <button class="lp-moderation-offer-submit" @click="offerPlan(userToInspect)">
                    {{ $t('community.moderationOfferButton') }}
                </button>
                <p v-if="offerResult" class="lp-moderation-offer-result">
                    {{ offerResult }}
                </p>
            </section>
            <section>
                <textarea id="lp-moderation-user-library-json" v-model="editableLibrary" />
            </section>
        </div>

        <div class="lp-moderation-reports">
            <h2>{{ $t('community.moderationReports') }} ({{ reports.length }} pending)</h2>
            <p v-if="reports.length === 0" style="color:#888">
                {{ $t('community.moderationNoPendingReports') }}
            </p>
            <table v-else class="lp-reports-table">
                <thead>
                    <tr>
                        <th>Reporter</th>
                        <th>Type</th>
                        <th>Target ID</th>
                        <th>Reason</th>
                        <th>Date</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="r in reports" :key="String(r._id)">
                        <td>{{ r.reporterUsername }}</td>
                        <td>{{ r.targetType }}</td>
                        <td style="font-size:11px">
                            <a v-if="r.targetType === 'list'" :href="`/p/${r.targetId}`" target="_blank">{{ r.targetId }}</a>
                            <a v-else :href="`/u/${r.targetId}`" target="_blank">{{ r.targetId }}</a>
                        </td>
                        <td>{{ r.reason }}</td>
                        <td>{{ formatDate(r.createdAt) }}</td>
                        <td>
                            <div class="lp-report-actions">
                                <button class="lp-btn-resolve" @click="resolveReport(r, 'resolved')">
                                    ✓ Resolve
                                </button>
                                <button class="lp-btn-dismiss" @click="resolveReport(r, 'dismissed')">
                                    ✕ Dismiss
                                </button>
                                <button v-if="r.targetType === 'list'" class="lp-btn-danger" @click="unpublishList(r)">
                                    Unpublish
                                </button>
                                <button class="lp-btn-danger" @click="banUser(r)">
                                    Ban{{ r.targetType === 'user' ? ` ${r.targetId}` : '' }}
                                </button>
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>

<script>
import { fetchJson } from '../utils/utils';
import { planLabel } from '../services/tier-labels';

export default {
    name: 'Admin',
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
            reports: [],
            error: null,
        };
    },
    computed: {
        resultsLoaded() {
            return !!this.searchResults;
        },
    },
    created() {
        this.loadReports();
    },
    methods: {
        searchUsers() {
            this.error = null;
            fetchJson(`/moderation/search?q=${this.searchQuery}`, {
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
            this.editableLibrary = JSON.stringify(this.userToInspect.library);
            this.newPassword = null;
        },
        clearSession(user) {
            this.error = null;
            fetchJson('/moderation/clear-session', {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username: user.username }),
            })
                .catch(() => {
                    this.error = 'Unable to clear session.';
                });
        },
        // Gives the account a plan for a few months (a creator invited to the beta). The server
        // refuses an account that pays for a subscription, and says why.
        offerPlan(user) {
            this.error = null;
            this.offerResult = null;
            fetchJson('/moderation/offer-plan', {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username: user.username, plan: this.offerPlanName, months: this.offerMonths }),
            })
                .then((response) => {
                    this.offerResult = this.$t('community.moderationOfferDone', {
                        plan: planLabel(response.plan),
                        date: new Date(response.currentPeriodEnd).toLocaleDateString(this.$i18n.locale, {
                            year: 'numeric', month: 'long', day: 'numeric',
                        }),
                    });
                })
                .catch((error) => {
                    this.error = error.message || 'Unable to offer the plan.';
                });
        },
        resetPassword(user) {
            this.error = null;
            fetchJson('/moderation/reset-password', {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username: user.username }),
            })
                .then((response) => {
                    this.newPassword = response.newPassword;
                })
                .catch(() => {
                    this.error = 'Unable to reset password.';
                });
        },
        async loadReports() {
            try {
                const data = await fetchJson('/api/reports');
                this.reports = data.reports || [];
            } catch {
                this.reports = [];
            }
        },
        async resolveReport(report, status) {
            try {
                await fetchJson(`/api/reports/${report._id}`, {
                    method: 'PATCH',
                    body: JSON.stringify({ status }),
                });
                this.reports = this.reports.filter((r) => String(r._id) !== String(report._id));
            } catch { /* ignore */ }
        },
        async banUser(report) {
            const username = report.targetType === 'user' ? report.targetId : prompt('Username to ban?');
            if (!username || !confirm(`Ban user "${username}"?`)) return;
            this.error = null;
            try {
                await fetchJson(`/api/reports/ban/${username}`, { method: 'POST' });
                await this.resolveReport(report, 'resolved');
            } catch {
                this.error = 'Failed to ban user.';
            }
        },
        async unpublishList(report) {
            if (!confirm(`Unpublish list "${report.targetId}"?`)) return;
            this.error = null;
            try {
                await fetchJson(`/api/reports/unpublish/${report.targetId}`, { method: 'POST' });
                await this.resolveReport(report, 'resolved');
            } catch {
                this.error = 'Failed to unpublish list.';
            }
        },
        formatDate(d) {
            return new Date(d).toLocaleDateString();
        },
    },
};
</script>
