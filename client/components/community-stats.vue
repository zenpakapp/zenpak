<template>
    <section class="lpModerationStats">
        <h2 class="lpModerationHeading">
            {{ $t('community.moderationStats') }}
        </h2>
        <p v-if="error" class="lpCommunityEmpty lp-moderation-stats-error">
            {{ error }}
        </p>
        <div v-else-if="groups.length" class="lpModerationStatsGrid">
            <div v-for="group in groups" :key="group.key" class="lpModerationStatsCard">
                <h3 class="lpModerationStatsTitle">
                    {{ group.title }}
                </h3>
                <dl class="lpModerationStatsRows">
                    <div v-for="row in group.rows" :key="row.key" class="lpModerationStatsRow">
                        <dt>{{ row.label }}</dt>
                        <dd :class="`lp-moderation-stat-${row.key}`">
                            {{ row.value }}
                        </dd>
                    </div>
                </dl>
            </div>
        </div>
    </section>
</template>

<script>
import { fetchJson } from '../utils/utils';

// Read-only numbers for the moderator: how many accounts, plans, public lists, and how much
// activity. They come from /moderation/stats, which only counts.
export default {
    name: 'CommunityStats',
    data() {
        return { stats: null, error: null };
    },
    computed: {
        groups() {
            const stats = this.stats;
            if (!stats) return [];
            const row = (key, label, value) => ({ key, label: this.$t(label), value: Number(value || 0).toLocaleString() });
            return [
                {
                    key: 'accounts',
                    title: this.$t('community.statsAccounts'),
                    rows: [
                        row('users-total', 'community.statsTotal', stats.users.total),
                        row('users-7', 'community.statsLast7', stats.users.last7Days),
                        row('users-30', 'community.statsLast30', stats.users.last30Days),
                        row('users-verified', 'community.statsVerified', stats.users.verified),
                        row('users-banned', 'community.statsBanned', stats.users.banned),
                    ],
                },
                {
                    key: 'plans',
                    title: this.$t('community.statsPlans'),
                    rows: [
                        row('plans-free', 'community.statsFree', stats.plans.free),
                        row('plans-supporter', 'community.statsKin', stats.plans.supporter),
                        row('plans-creator', 'community.statsWayfarer', stats.plans.creator),
                        row('plans-offered', 'community.statsOffered', stats.plans.offered),
                    ],
                },
                {
                    key: 'lists',
                    title: this.$t('community.statsLists'),
                    rows: [
                        row('lists-shareable', 'community.statsShared', stats.lists.shareable),
                        row('lists-discoverable', 'community.statsDiscover', stats.lists.discoverable),
                        row('lists-indexable', 'community.statsIndexed', stats.lists.indexable),
                        row('lists-featured', 'community.statsFeatured', stats.lists.featured),
                    ],
                },
                {
                    key: 'activity',
                    title: this.$t('community.statsActivity'),
                    rows: [
                        row('activity-views', 'community.statsViews', stats.activity.views),
                        row('activity-copies', 'community.statsCopies', stats.activity.copies),
                        row('activity-reports', 'community.statsReports', stats.activity.pendingReports),
                    ],
                },
            ];
        },
    },
    created() {
        this.load();
    },
    methods: {
        async load() {
            this.error = null;
            try {
                this.stats = await fetchJson('/moderation/stats');
            } catch {
                this.stats = null;
                this.error = this.$t('community.statsError');
            }
        },
    },
};
</script>
