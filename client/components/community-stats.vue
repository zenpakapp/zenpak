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
            // A row whose label names a plan ("Kin, monthly"): the plan name is the one of the plans card.
            const planRow = (key, label, plan, value) => ({
                key,
                label: this.$t(label, { plan: this.$t(plan === 'supporter' ? 'community.statsKin' : 'community.statsWayfarer') }),
                value: Number(value || 0).toLocaleString(),
            });
            const share = stats.conversion && stats.conversion.verified
                ? Math.round((stats.conversion.paying / stats.conversion.verified) * 100) : 0;
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
                        { key: 'plans-conversion', label: this.$t('community.statsConversion'), value: `${share} %` },
                    ],
                },
                {
                    key: 'subscriptions',
                    title: this.$t('community.statsSubscriptions'),
                    rows: [
                        planRow('subs-supporter-month', 'community.statsPlanMonthly', 'supporter', stats.subscriptions.monthly.supporter),
                        planRow('subs-supporter-year', 'community.statsPlanAnnual', 'supporter', stats.subscriptions.yearly.supporter),
                        planRow('subs-creator-month', 'community.statsPlanMonthly', 'creator', stats.subscriptions.monthly.creator),
                        planRow('subs-creator-year', 'community.statsPlanAnnual', 'creator', stats.subscriptions.yearly.creator),
                    ],
                },
                {
                    key: 'new-by-plan',
                    title: this.$t('community.statsNewByPlan'),
                    rows: [
                        planRow('new-supporter-7', 'community.statsPlanNew7', 'supporter', stats.newByPlan.last7Days.supporter),
                        planRow('new-supporter-30', 'community.statsPlanNew30', 'supporter', stats.newByPlan.last30Days.supporter),
                        planRow('new-creator-7', 'community.statsPlanNew7', 'creator', stats.newByPlan.last7Days.creator),
                        planRow('new-creator-30', 'community.statsPlanNew30', 'creator', stats.newByPlan.last30Days.creator),
                    ],
                },
                {
                    key: 'billing',
                    title: this.$t('community.statsBilling'),
                    rows: [
                        row('billing-active', 'community.statsBillingActive', stats.billing.active),
                        row('billing-trialing', 'community.statsBillingTrialing', stats.billing.trialing),
                        row('billing-past-due', 'community.statsBillingPastDue', stats.billing.pastDue),
                        row('billing-ending', 'community.statsBillingEnding', stats.billing.endingAtPeriodEnd),
                        row('billing-canceled', 'community.statsBillingCanceled', stats.billing.canceled),
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
                        row('activity-csv', 'community.statsCsvDownloads', stats.activity.csvDownloads),
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
