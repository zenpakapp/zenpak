<template>
    <div>
        <h2 style="font-size:14px;font-weight:700;margin-bottom:16px">{{ $t('community.moderationReports') }} ({{ reports.length }} pending)</h2>
        <p v-if="loading" class="lpCommunityEmpty">{{ $t('community.loading') }}</p>
        <p v-else-if="reports.length === 0" class="lpCommunityEmpty">{{ $t('community.moderationNoPendingReports') }}</p>
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
                    <button class="lpButton lpSmall" @click="resolve(r, 'resolved')">{{ $t('community.moderationResolve') }}</button>
                    <button class="lpButton lpSmall" @click="resolve(r, 'dismissed')">{{ $t('community.moderationDismiss') }}</button>
                    <button v-if="r.targetType === 'list'" class="lpButton lpSmall" @click="$emit('feature-list', r.targetId)">{{ $t('community.moderationFeature') }}</button>
                    <button v-if="r.targetType === 'list'" class="lpButton lpSmall lpButtonDanger" @click="unpublish(r)">{{ $t('community.moderationUnpublish') }}</button>
                    <button class="lpButton lpSmall lpButtonDanger" @click="ban(r)">{{ $t('community.moderationBan') }}</button>
                </div>
            </div>
        </template>
    </div>
</template>

<script>
import { fetchJson } from '../utils/utils.js';

export default {
    name: 'CommunityModeration',
    emits: ['feature-list'],
    data() {
        return {
            reports: [],
            loading: false,
        };
    },
    created() {
        this.load();
    },
    methods: {
        async load() {
            this.loading = true;
            try {
                const data = await fetchJson('/api/reports');
                this.reports = data.reports || [];
            } catch {
                this.reports = [];
            } finally {
                this.loading = false;
            }
        },
        async resolve(report, status) {
            try {
                await fetchJson(`/api/reports/${report._id}`, {
                    method: 'PATCH',
                    body: JSON.stringify({ status }),
                });
                this.reports = this.reports.filter(r => String(r._id) !== String(report._id));
            } catch {}
        },
        async ban(report) {
            const username = report.targetType === 'user' ? report.targetId : prompt('Username to ban?');
            if (!username || !confirm(`Ban "${username}"?`)) return;
            try {
                await fetchJson(`/api/reports/ban/${username}`, { method: 'POST' });
                await this.resolve(report, 'resolved');
            } catch { alert('Failed.'); }
        },
        async unpublish(report) {
            if (!confirm(`Unpublish "${report.targetId}"?`)) return;
            try {
                await fetchJson(`/api/reports/unpublish/${report.targetId}`, { method: 'POST' });
                await this.resolve(report, 'resolved');
            } catch { alert('Failed.'); }
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
