<style lang="scss">
@import "../css/_globals";


#lp-moderation {
    padding: 0 2em;
    display: grid;
    grid-template-columns: 15em auto;

    h1, & > form {
        grid-column-start: 1;
        grid-column-end: 3;
    }

    .lp-moderation-search-results {
        grid-column: 1;
    }

    .lp-moderation-user-to-inspect {
        grid-column: 2;
    }
}

#lp-moderation-user-library-json {
    width: 100%;
    height: 20em;
}

.lp-reports-table {
    border-collapse: collapse;
    font-size: 13px;
    width: 100%;
}
.lp-reports-table th, .lp-reports-table td {
    border: 1px solid #ddd;
    padding: 6px 10px;
    text-align: left;
}
.lp-moderation-reports {
    grid-column: 1 / -1;
    margin-top: 32px;
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
                        <td style="font-size:11px;word-break:break-all">{{ r.targetId }}</td>
                        <td>{{ r.reason }}</td>
                        <td>{{ formatDate(r.createdAt) }}</td>
                        <td>
                            <button @click="resolveReport(r, 'resolved')">Resolve</button>
                            <button @click="resolveReport(r, 'dismissed')">Dismiss</button>
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
        formatDate(d) {
            return new Date(d).toLocaleDateString();
        },
    },
};
</script>
