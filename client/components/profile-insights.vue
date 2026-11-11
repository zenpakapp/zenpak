<template>
    <div class="lpInsights">
        <h2 class="lpInsightsTitle">
            {{ $t('misc.insights') }}
        </h2>

        <p v-if="loading" class="lpInsightsMessage">
            {{ $t('misc.loading') }}
        </p>
        <p v-else-if="error" class="lpInsightsMessage" role="alert">
            {{ error }}
        </p>
        <template v-else-if="data">
            <div class="lpInsightsTotals">
                <div class="lpInsightsStat">
                    <strong>{{ data.totals.followers }}</strong>
                    <span>{{ $t('misc.followers') }}</span>
                </div>
                <div class="lpInsightsStat">
                    <strong>{{ data.totals.views }}</strong>
                    <span>{{ $t('misc.views') }}</span>
                </div>
                <div class="lpInsightsStat">
                    <strong>{{ data.totals.copies }}</strong>
                    <span>{{ $t('misc.copies') }}</span>
                </div>
            </div>

            <table v-if="data.lists.length" class="lpInsightsTable">
                <thead>
                    <tr>
                        <th>{{ $t('public.statLists') }}</th>
                        <th>{{ $t('misc.views') }}</th>
                        <th>{{ $t('misc.copies') }}</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="list in data.lists" :key="list.externalId">
                        <td>{{ list.name }}</td>
                        <td>{{ list.viewCount }}</td>
                        <td>{{ list.copyCount }}</td>
                    </tr>
                </tbody>
            </table>
            <p v-else class="lpInsightsMessage">
                {{ $t('misc.noPublicLists') }}
            </p>
        </template>
    </div>
</template>

<script>
import { fetchJson } from '../utils/utils';

export default {
    name: 'ProfileInsights',
    data() {
        return { loading: true, error: null, data: null };
    },
    created() {
        fetchJson('/api/community/insights')
            .then((d) => { this.data = d; })
            .catch(() => { this.error = this.$t('misc.loadInsightsError'); })
            .finally(() => { this.loading = false; });
    },
};
</script>

<style lang="scss">
@import "../css/_globals";

.lpInsightsMessage {
    color: $color-text-muted;
    font-size: $fontSize-sm;
}

.lpInsightsTitle {
    font-size: $fontSize-base;
    font-weight: $fontWeight-bold;
    margin-bottom: 16px;
}

.lpInsightsTotals {
    display: flex;
    gap: 24px;
    margin-bottom: 16px;
}

.lpInsightsStat {
    text-align: center;

    strong {
        display: block;
        font-size: 22px;
        font-weight: 700;
    }

    span {
        color: $color-text-muted;
        font-size: 11px;
    }
}

.lpInsightsTable {
    border-collapse: collapse;
    font-size: 13px;
    width: 100%;

    th {
        border-bottom: 1px solid $color-border;
        color: $color-text-muted;
        font-size: 11px;
        font-weight: 600;
        padding: 4px 8px;
        text-align: right;
        text-transform: uppercase;

        &:first-child { text-align: left; }
    }

    td {
        border-bottom: 1px solid $color-border;
        padding: 6px 8px;
        text-align: right;

        &:first-child { text-align: left; }
    }
}
</style>
