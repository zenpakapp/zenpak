<template>
    <div v-if="stats" class="shareSection lpListInsights">
        <div class="shareLabel">
            {{ $t('misc.insights') }}
        </div>
        <p class="shareVisibilityHint">
            {{ $t('misc.views') }} {{ stats.viewCount }} · {{ $t('misc.copies') }} {{ stats.copyCount }}
        </p>
    </div>
</template>

<script>
import { fetchJson } from '../utils/utils';

// The views and copies of one published list, for Wayfarer accounts. Nothing is drawn for other
// plans, while loading, or when the list is not in the creator's insights yet.
export default {
    name: 'ListInsightsLine',
    props: {
        externalId: { type: String, required: true },
    },
    data() {
        return { stats: null };
    },
    computed: {
        isGuide() {
            const lib = this.$store.state.library;
            return !!(lib && lib.entitlements && lib.entitlements.plan === 'creator');
        },
    },
    watch: {
        externalId: 'load',
    },
    created() {
        this.load();
    },
    methods: {
        load() {
            this.stats = null;
            if (!this.isGuide) return Promise.resolve();
            return fetchJson('/api/community/insights')
                .then((data) => {
                    this.stats = (data.lists || []).find((l) => l.externalId === this.externalId) || null;
                })
                .catch(() => { this.stats = null; });
        },
    },
};
</script>
