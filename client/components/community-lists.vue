<template>
    <section class="lpModerationLists">
        <h2 class="lpModerationHeading">
            {{ $t('community.moderationLists') }}
        </h2>
        <form class="lpModerationSearch" @submit.prevent="searchLists">
            <input
                v-model="searchQuery"
                class="lpCommunitySearchInput lp-moderation-list-search"
                type="text"
                :placeholder="$t('community.moderationListSearchPlaceholder')"
            >
            <button class="lpButton lpSmall">
                {{ $t('community.moderationSearchButton') }}
            </button>
        </form>
        <p v-if="error" class="lpCommunityEmpty lp-moderation-list-error">
            {{ error }}
        </p>
        <p v-if="searched && lists.length === 0" class="lpCommunityEmpty">
            {{ $t('community.moderationNoLists') }}
        </p>
        <ul v-else class="lpModerationListRows">
            <li v-for="list in lists" :key="list.externalId" class="lpModerationListRow">
                <div class="lpModerationListInfo">
                    <a :href="`/p/${list.externalId}`" target="_blank" class="lpHref">{{ list.name || list.externalId }}</a>
                    <span class="lpModerationListAuthor">@{{ list.ownerUsername }}</span>
                    <span v-if="list.featured" class="lpCommunityBadge lp-moderation-list-featured">★</span>
                </div>
                <div class="lpModerationReportActions">
                    <button class="lpButton lpSmall lp-moderation-list-feature" @click="toggleFeatured(list)">
                        {{ list.featured ? $t('community.moderationUnfeature') : $t('community.moderationFeature') }}
                    </button>
                    <button class="lpButton lpSmall lpButtonDanger lp-moderation-list-unpublish" @click="unpublish(list)">
                        {{ $t('community.moderationUnpublish') }}
                    </button>
                </div>
            </li>
        </ul>
    </section>
</template>

<script>
import { fetchJson } from '../utils/utils.js';

export default {
    name: 'CommunityLists',
    data() {
        return {
            searchQuery: '',
            lists: [],
            searched: false,
            error: null,
        };
    },
    created() {
        // The newest lists, so the moderator can browse before typing anything.
        this.searchLists();
    },
    methods: {
        async searchLists() {
            this.error = null;
            try {
                const response = await fetchJson(`/moderation/search-lists?q=${encodeURIComponent(this.searchQuery)}`, {
                    method: 'GET',
                    credentials: 'same-origin',
                });
                this.lists = response.results || [];
                this.searched = true;
            } catch {
                this.error = 'Unable to search lists.';
            }
        },
        async toggleFeatured(list) {
            this.error = null;
            try {
                const response = await fetchJson(`/api/reports/feature/${list.externalId}`, { method: 'POST' });
                list.featured = response.featured;
            } catch {
                this.error = 'Unable to update featured list.';
            }
        },
        async unpublish(list) {
            if (!confirm(`Unpublish "${list.name || list.externalId}"?`)) return;
            this.error = null;
            try {
                await fetchJson(`/api/reports/unpublish/${list.externalId}`, { method: 'POST' });
                this.lists = this.lists.filter((l) => l.externalId !== list.externalId);
            } catch {
                this.error = 'Unable to unpublish list.';
            }
        },
    },
};
</script>
