<template>
    <div>
        <community-stats />
        <community-accounts />
        <community-lists />
        <h2 class="lpModerationHeading">
            {{ $t('community.moderationReports') }} ({{ total }} pending)
        </h2>
        <div class="lpModerationReportFilters">
            <lp-select
                :value="filterType"
                :options="typeOptions"
                :aria-label="$t('community.ariaFilterReportType')"
                @change="val => { filterType = val; load(); }"
            />
            <lp-select
                :value="filterReason"
                :options="reasonOptions"
                :aria-label="$t('community.ariaFilterReportReason')"
                @change="val => { filterReason = val; load(); }"
            />
        </div>
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
            <div v-for="r in reports" :key="`${r.targetType}:${r.targetId}`" class="lpModerationReport">
                <div class="lpModerationReportMeta">
                    <span class="lpCommunityBadge">{{ typeLabel(r.targetType) }}</span>
                    <span v-if="r.count > 1" class="lpModerationReportCount">{{ $t('community.moderationReportCount', { count: r.count }) }}</span>
                    <span>{{ reasonsLabel(r.reasons) }}</span>
                    <span>{{ $t('community.moderationReportedBy', { names: r.reporters.join(', ') }) }}</span>
                    <span>{{ timeAgo(r.latestAt) }}</span>
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
            <button v-if="hasMore" class="lpCommunityLoadMore" :disabled="loadingMore" @click="loadMore">
                {{ loadingMore ? $t('community.loading') : $t('community.feedLoadMore') }}
            </button>
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
import CommunityStats from './community-stats.vue';
import CommunityLists from './community-lists.vue';
import ConfirmDialog from './confirm-dialog.vue';
import LpSelect from './lp-select.vue';

const REPORT_TYPES = ['list', 'user'];
const REPORT_REASONS = ['spam', 'inappropriate', 'fake', 'other'];
const REASON_LABEL_KEYS = {
    spam: 'misc.reportReasonSpam',
    inappropriate: 'misc.reportReasonInappropriate',
    fake: 'misc.reportReasonFake',
    other: 'misc.reportReasonOther',
};

export default {
    name: 'CommunityModeration',
    components: {
        CommunityAccounts, CommunityLists, CommunityStats, ConfirmDialog, LpSelect,
    },
    emits: ['feature-list'],
    data() {
        return {
            reports: [],
            total: 0,
            hasMore: false,
            loading: false,
            loadingMore: false,
            error: null,
            pending: null,
            filterType: '',
            filterReason: '',
        };
    },
    computed: {
        typeOptions() {
            return [
                { value: '', label: this.$t('community.moderationAllTypes') },
                ...REPORT_TYPES.map((value) => ({ value, label: this.typeLabel(value) })),
            ];
        },
        reasonOptions() {
            return [
                { value: '', label: this.$t('community.moderationAllReasons') },
                ...REPORT_REASONS.map((value) => ({ value, label: this.$t(REASON_LABEL_KEYS[value]) })),
            ];
        },
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
        typeLabel(type) {
            return this.$t(type === 'user' ? 'community.moderationTypeUser' : 'community.moderationTypeList');
        },
        reasonsLabel(reasons) {
            return Object.entries(reasons || {})
                .map(([reason, count]) => {
                    const label = REASON_LABEL_KEYS[reason] ? this.$t(REASON_LABEL_KEYS[reason]) : reason;
                    return count > 1 ? `${label} ×${count}` : label;
                })
                .join(' · ');
        },
        fetchPage(skip) {
            const params = new URLSearchParams();
            if (this.filterType) params.set('type', this.filterType);
            if (this.filterReason) params.set('reason', this.filterReason);
            if (skip) params.set('skip', skip);
            const query = params.toString();
            return fetchJson(query ? `/api/reports?${query}` : '/api/reports');
        },
        async load() {
            this.loading = true;
            this.error = null;
            try {
                const data = await this.fetchPage(0);
                this.reports = data.reports || [];
                this.total = data.total || 0;
                this.hasMore = !!data.hasMore;
            } catch {
                this.reports = [];
                this.total = 0;
                this.hasMore = false;
                this.error = 'Unable to load reports.';
            } finally {
                this.loading = false;
            }
        },
        async loadMore() {
            this.loadingMore = true;
            try {
                const data = await this.fetchPage(this.reports.length);
                this.reports = this.reports.concat(data.reports || []);
                this.total = data.total || this.total;
                this.hasMore = !!data.hasMore;
            } catch {
                this.error = 'Unable to load reports.';
            } finally {
                this.loadingMore = false;
            }
        },
        // Closes every pending report on the target at once
        async resolve(report, status) {
            this.error = null;
            try {
                await fetchJson('/api/reports/target', {
                    method: 'PATCH',
                    body: JSON.stringify({ targetType: report.targetType, targetId: report.targetId, status }),
                });
                this.reports = this.reports.filter((r) => r.targetType !== report.targetType || r.targetId !== report.targetId);
                this.total = Math.max(this.total - 1, 0);
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
