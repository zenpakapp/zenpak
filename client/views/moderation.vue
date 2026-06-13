<style lang="scss">
@import "../css/_globals";

#lp-moderation {
    display: grid;
    gap: 0 24px;
    grid-template-columns: 15em auto;
    margin: 0 auto;
    max-width: 1100px;
    padding: 32px 20px 80px;

    h1 {
        color: $color-text;
        font-size: $fontSize-md;
        font-weight: $fontWeight-bold;
        grid-column: 1 / -1;
        margin-bottom: 16px;
    }

    & > form {
        grid-column: 1 / -1;
        display: flex;
        gap: 8px;
        margin-bottom: 20px;

        input {
            background: $color-surface;
            border: 1px solid $color-border;
            border-radius: $radius-sm;
            color: $color-text;
            font-size: $fontSize-sm;
            padding: 6px 10px;
            width: 240px;

            &:focus {
                border-color: $color-accent;
                outline: none;
            }
        }

        button {
            background: $color-accent;
            border: none;
            border-radius: $radius-sm;
            color: #fff;
            cursor: pointer;
            font-size: $fontSize-sm;
            padding: 6px 14px;

            &:hover { opacity: 0.9; }
        }
    }

    .lp-moderation-search-results {
        grid-column: 1;
        list-style: none;
        padding: 0;

        li {
            border-radius: $radius-sm;
            color: $color-text-muted;
            cursor: pointer;
            font-size: $fontSize-sm;
            padding: 6px 10px;

            &:hover {
                background: $color-control-muted;
                color: $color-text;
            }
        }
    }

    .lp-moderation-user-to-inspect {
        grid-column: 2;

        h2 {
            color: $color-text;
            font-size: $fontSize-base;
            font-weight: $fontWeight-bold;
            margin-bottom: 12px;
        }

        section {
            display: flex;
            gap: 8px;
            margin-bottom: 12px;

            button {
                background: $color-control-muted;
                border: 1px solid $color-border;
                border-radius: $radius-sm;
                color: $color-text;
                cursor: pointer;
                font-size: $fontSize-sm;
                padding: 5px 12px;

                &:hover { border-color: $color-accent; }
            }

            strong {
                color: $color-text;
                font-size: $fontSize-sm;
            }
        }
    }
}

#lp-moderation-user-library-json {
    background: $color-surface;
    border: 1px solid $color-border;
    border-radius: $radius-sm;
    color: $color-text;
    font-family: monospace;
    font-size: 12px;
    height: 20em;
    padding: 8px;
    width: 100%;
}

.lp-moderation-reports {
    grid-column: 1 / -1;
    margin-top: 40px;

    h2 {
        color: $color-text;
        font-size: $fontSize-base;
        font-weight: $fontWeight-bold;
        margin-bottom: 16px;
    }
}

.lp-reports-table {
    border-collapse: collapse;
    font-size: $fontSize-sm;
    width: 100%;

    th {
        background: $color-control-muted;
        border-bottom: 2px solid $color-border;
        color: $color-text-muted;
        font-size: $fontSize-xs;
        font-weight: $fontWeight-bold;
        letter-spacing: $letterSpacing-caps;
        padding: 8px 12px;
        text-align: left;
        text-transform: uppercase;
    }

    td {
        border-bottom: 1px solid $color-border;
        color: $color-text;
        padding: 10px 12px;
        vertical-align: middle;

        a {
            color: $color-accent;
            font-size: 11px;
            text-decoration: none;
            word-break: break-all;

            &:hover { text-decoration: underline; }
        }
    }

    tr:hover td {
        background: rgba(var(--color-accent-rgb), 0.04);
    }

    .lp-report-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
    }

    .lp-btn-resolve {
        background: rgba(var(--color-accent-rgb), 0.1);
        border: 1px solid $color-accent;
        border-radius: $radius-sm;
        color: $color-accent;
        cursor: pointer;
        font-size: 11px;
        padding: 3px 8px;

        &:hover { background: $color-accent; color: #fff; }
    }

    .lp-btn-dismiss {
        background: $color-control-muted;
        border: 1px solid $color-border;
        border-radius: $radius-sm;
        color: $color-text-muted;
        cursor: pointer;
        font-size: 11px;
        padding: 3px 8px;

        &:hover { border-color: $color-text-muted; color: $color-text; }
    }

    .lp-btn-danger {
        background: rgba(220, 53, 69, 0.08);
        border: 1px solid rgba(220, 53, 69, 0.4);
        border-radius: $radius-sm;
        color: #dc3545;
        cursor: pointer;
        font-size: 11px;
        padding: 3px 8px;

        &:hover { background: #dc3545; color: #fff; }
    }
}
</style>

<template>
    <div id="lp-moderation">
        <h1>Admin panel</h1>

        <form @submit.prevent="searchUsers">
            <input v-model="searchQuery" type="text" placeholder="Search for a user..." />
            <button>Search</button>
        </form>
        <ul v-if="resultsLoaded" class="lp-moderation-search-results">
            <li v-for="result in searchResults" @click="setUser(result)" :key="result.username">
                {{result.username}}
            </li>
        </ul>

        <div v-if="userToInspect" class="lp-moderation-user-to-inspect">
            <h2>{{userToInspect.username}}</h2>
            <section>
                <button @click="clearSession(userToInspect)">Clear session</button>
                <button @click="resetPassword(userToInspect)">Reset password</button>
                <template v-if="newPassword">
                    <strong>New Password:</strong> {{ newPassword }}
                </template>
            </section>
            <section>
                <textarea id="lp-moderation-user-library-json" v-model="editableLibrary"></textarea>
            </section>
        </div>

        <div class="lp-moderation-reports">
            <h2>Reports ({{ reports.length }} pending)</h2>
            <p v-if="reports.length === 0" style="color:#888">No pending reports.</p>
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
