<template>
    <div>
        <community-accounts />
        <community-lists />
        <h2 class="lpModerationHeading">
            {{ $t('community.moderationReports') }} ({{ reports.length }} pending)
        </h2>
        <p v-if="error" class="lpCommunityEmpty">
            {{ error }}
        </p>
        <p v-if="loading" class="lpCommunityEmpty">
            {{ $t('community.loading') }}
        </p>
        <p v-else-if="reports.length === 0" class="lpCommunityEmpty">
            {{ $t('community.moderationNoPendingReports') }}
        </p>
        <template v-else>
            <div v-for="r in reports" :key="String(r._id)" class="lpModerationReport">
                <div class="lpModerationReportMeta">
                    <span class="lpCommunityBadge">{{ r.targetType }}</span>
                    <span>{{ r.reason }}</span>
                    <span>by {{ r.reporterUsername }}</span>
                    <span>{{ timeAgo(r.createdAt) }}</span>
                </div>
                <div class="lpModerationReportTarget">
                    <a :href="r.targetType === 'list' ? `/p/${r.targetId}` : `/u/${r.targetId}`" target="_blank" class="lpHref">{{ r.targetId }}</a>
                </div>
                <div class="lpModerationReportActions">
                    <button class="lpButton lpSmall" @click="resolve(r, 'resolved')">
                        {{ $t('community.moderationResolve') }}
                    </button>
                    <button class="lpButton lpSmall" @click="resolve(r, 'dismissed')">
                        {{ $t('community.moderationDismiss') }}
                    </button>
                    <button v-if="r.targetType === 'list'" class="lpButton lpSmall" @click="$emit('feature-list', r.targetId)">
                        {{ $t('community.moderationFeature') }}
                    </button>
                    <button v-if="r.targetType === 'list'" class="lpButton lpSmall lpButtonDanger" @click="pending = { type: 'unpublish', report: r }">
                        {{ $t('community.moderationUnpublish') }}
                    </button>
                    <button v-if="banTarget(r)" class="lpButton lpSmall lpButtonDanger lp-moderation-ban" @click="pending = { type: 'ban', report: r }">
                        {{ $t('community.moderationBan') }} @{{ banTarget(r) }}
                    </button>
                </div>
            </div>
        </template>
        <confirm-dialog
            :shown="Boolean(pending)"
            :title="confirmTitle"
            :message="pending && pending.type === 'ban' ? $t('community.moderationConfirmBan') : $t('community.moderationConfirmUnpublish')"
            :confirm-label="pending && pending.type === 'ban' ? $t('community.moderationBan') : $t('community.moderationUnpublish')"
            danger
            @confirm="runPending"
            @cancel="pending = null"
        />
    </div>
</template>

<script>
import { fetchJson } from '../utils/utils';
import CommunityAccounts from './community-accounts.vue';
import CommunityLists from './community-lists.vue';
import ConfirmDialog from './confirm-dialog.vue';

export default {
    name: 'CommunityModeration',
    components: { CommunityAccounts, CommunityLists, ConfirmDialog },
    emits: ['feature-list'],
    data() {
        return {
            reports: [],
            loading: false,
            error: null,
            pending: null,
        };
    },
    computed: {
        confirmTitle() {
            if (!this.pending) return '';
            const { type, report } = this.pending;
            return type === 'ban'
                ? this.$t('community.moderationConfirmBanTitle', { name: this.banTarget(report) })
                : this.$t('community.moderationConfirmUnpublishTitle', { name: report.targetId });
        },
    },
    created() {
        this.load();
    },
    methods: {
        async load() {
            this.loading = true;
            this.error = null;
            try {
                const data = await fetchJson('/api/reports');
                this.reports = data.reports || [];
            } catch {
                this.reports = [];
                this.error = 'Unable to load reports.';
            } finally {
                this.loading = false;
            }
        },
        async resolve(report, status) {
            this.error = null;
            try {
                await fetchJson(`/api/reports/${report._id}`, {
                    method: 'PATCH',
                    body: JSON.stringify({ status }),
                });
                this.reports = this.reports.filter((r) => String(r._id) !== String(report._id));
            } catch {
                this.error = 'Unable to update report.';
            }
        },
        // The account a report is about: the reported user, or the author of the reported list.
        banTarget(report) {
            return report.targetType === 'user' ? report.targetId : report.targetOwnerUsername;
        },
        // The confirmation box is shown for `pending`; the action runs when it is confirmed.
        async runPending() {
            const { type, report } = this.pending;
            this.pending = null;
            if (type === 'ban') await this.ban(report);
            else await this.unpublish(report);
        },
        async ban(report) {
            const username = this.banTarget(report);
            if (!username) return;
            this.error = null;
            try {
                await fetchJson(`/api/reports/ban/${username}`, { method: 'POST' });
                await this.resolve(report, 'resolved');
            } catch {
                this.error = 'Unable to ban user.';
            }
        },
        async unpublish(report) {
            this.error = null;
            try {
                await fetchJson(`/api/reports/unpublish/${report.targetId}`, { method: 'POST' });
                await this.resolve(report, 'resolved');
            } catch {
                this.error = 'Unable to unpublish list.';
            }
        },
        timeAgo(dateStr) {
            const diff = Date.now() - new Date(dateStr).getTime();
            const mins = Math.floor(diff / 60000);
            if (mins < 1) return 'just now';
            if (mins < 60) return `${mins}m ago`;
            const hours = Math.floor(mins / 60);
            if (hours < 24) return `${hours}h ago`;
            const days = Math.floor(hours / 24);
            if (days < 7) return `${days}d ago`;
            return new Date(dateStr).toLocaleDateString();
        },
    },
};
</script>
