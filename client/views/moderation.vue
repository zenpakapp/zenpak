<style lang="scss">
@import "../css/_moderation";
</style>

<template>
    <div id="lp-moderation">
        <h1>{{ $t('community.moderationTitle') }}</h1>

        <form @submit.prevent="searchUsers">
            <input v-model="searchQuery" type="text" :placeholder="$t('community.moderationSearchUserPlaceholder')" />
            <button>{{ $t('community.moderationSearchButton') }}</button>
        </form>
        <ul v-if="resultsLoaded" class="lp-moderation-search-results">
            <li v-for="result in searchResults" @click="setUser(result)" :key="result.username">
                {{result.username}}
            </li>
        </ul>

        <div v-if="userToInspect" class="lp-moderation-user-to-inspect">
            <h2>{{userToInspect.username}}</h2>
            <section>
                <button @click="clearSession(userToInspect)">{{ $t('community.moderationClearSession') }}</button>
                <button @click="resetPassword(userToInspect)">{{ $t('community.moderationResetPassword') }}</button>
                <template v-if="newPassword">
                    <strong>{{ $t('community.moderationNewPassword') }}</strong> {{ newPassword }}
                </template>
            </section>
            <section>
                <textarea id="lp-moderation-user-library-json" v-model="editableLibrary"></textarea>
            </section>
        </div>

        <div class="lp-moderation-reports">
            <h2>{{ $t('community.moderationReports') }} ({{ reports.length }} pending)</h2>
            <p v-if="reports.length === 0" style="color:#888">{{ $t('community.moderationNoPendingReports') }}</p>
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
                                <button class="lp-btn-resolve" @click="resolveReport(r, 'resolved')">✓ Resolve</button>
                                <button class="lp-btn-dismiss" @click="resolveReport(r, 'dismissed')">✕ Dismiss</button>
                                <button v-if="r.targetType === 'list'" class="lp-btn-danger" @click="unpublishList(r)">Unpublish</button>
                                <button class="lp-btn-danger" @click="banUser(r)">Ban{{ r.targetType === 'user' ? ` ${r.targetId}` : '' }}</button>
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>

<script>
import { push } from '../services/navigation';
import { fetchJson } from '../utils/utils';

export default {
    name: 'Admin',
    components: {
    },
    data() {
        return {
            searchQuery: "",
            searchResults: null,
            userToInspect: null,
            editableLibrary: null,
            newPassword: null,
            reports: [],
        };
    },
    computed: {
        resultsLoaded() {
            return !!this.searchResults;
        }
    },
    created() {
        if (false) {
            push('/welcome');
        }
        this.loadReports();
    },
    methods: {
        searchUsers() {
            fetchJson(`/moderation/search?q=${this.searchQuery}`, {
                method: 'GET',
                credentials: 'same-origin',
            })
            .then((response) => {
                this.searchResults = response.results;
            })
            .catch((err) => {
                console.log(err);
            });
        },
        setUser(user) {
            this.userToInspect = user;
            this.editableLibrary = JSON.stringify(this.userToInspect.library);
            this.newPassword = null;
        },
        clearSession(user) {
            fetchJson(`/moderation/clear-session`, {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({username: user.username}),
            })
            .then((response) => {
                console.log("clear session success");
            })
            .catch((err) => {
                console.log(err);
            });
        },
        resetPassword(user) {
            fetchJson(`/moderation/reset-password`, {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({username: user.username}),
            })
            .then((response) => {
                this.newPassword = response.newPassword;
            })
            .catch((err) => {
                console.log(err);
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
                this.reports = this.reports.filter(r => String(r._id) !== String(report._id));
            } catch {}
        },
        async banUser(report) {
            const username = report.targetType === 'user' ? report.targetId : prompt('Username to ban?');
            if (!username || !confirm(`Ban user "${username}"?`)) return;
            try {
                await fetchJson(`/api/reports/ban/${username}`, { method: 'POST' });
                await this.resolveReport(report, 'resolved');
            } catch { alert('Failed to ban user.'); }
        },
        async unpublishList(report) {
            if (!confirm(`Unpublish list "${report.targetId}"?`)) return;
            try {
                await fetchJson(`/api/reports/unpublish/${report.targetId}`, { method: 'POST' });
                await this.resolveReport(report, 'resolved');
            } catch { alert('Failed to unpublish list.'); }
        },
        formatDate(d) {
            return new Date(d).toLocaleDateString();
        },
    },
};
</script>
