<template>
    <div>
        <div class="lpCommunitySearch">
            <input
                v-model="peopleQuery"
                type="text"
                class="lpCommunitySearchInput"
                :placeholder="$t('community.peopleSearchPlaceholder')"
                autofocus
                @input="onInput"
            >
        </div>
        <p v-if="loading" class="lpCommunityEmpty">
            {{ $t('community.loading') }}
        </p>
        <p v-else-if="error" class="lpCommunityEmpty">
            {{ error }}
        </p>
        <p v-else-if="results.length === 0" class="lpCommunityEmpty">
            {{ $t('community.peopleNoUsersFound') }}
        </p>
        <template v-else>
            <router-link
                v-for="user in results"
                :key="user.username"
                :to="`/u/${user.username}`"
                class="lpCommunityCard lpCommunityCardUser"
            >
                <div class="lpCommunityCardUserAvatar">
                    <img v-if="user.avatarUrl" :src="user.avatarUrl" :alt="user.displayName || user.username">
                    <span v-else :style="{ background: avatarBgColor(user), color: '#fff' }">{{ avatarLetter(user) }}</span>
                </div>
                <div class="lpCommunityCardUserBody">
                    <div class="lpCommunityCardName">
                        {{ user.displayName || user.username }}
                        <span v-if="user.tier === 'guide'" class="lpCommunityBadge">{{ tierLabel('guide') }}</span>
                        <span v-else-if="user.tier === 'trail'" class="lpCommunityBadge">{{ tierLabel('trail') }}</span>
                    </div>
                    <div class="lpCommunityCardAuthor">
                        @{{ user.username }}
                    </div>
                    <div v-if="user.bio" class="lpCommunityCardMeta">
                        {{ user.bio }}
                    </div>
                </div>
            </router-link>
            <button v-if="hasMore" class="lpCommunityLoadMore" :disabled="loadingMore" @click="loadMore">
                {{ loadingMore ? $t('community.loading') : $t('community.feedLoadMore') }}
            </button>
        </template>
    </div>
</template>

<script>
import { avatarColor, avatarInitial } from '../utils/avatar';
import { fetchJson } from '../utils/utils';
import { tierLabel } from '../services/tier-labels';

export default {
    name: 'CommunityPeople',
    data() {
        return {
            peopleQuery: '',
            results: [],
            loading: false,
            loadingMore: false,
            hasMore: false,
            error: null,
            timeout: null,
        };
    },
    mounted() {
        this.search();
    },
    methods: {
        tierLabel,
        onInput() {
            clearTimeout(this.timeout);
            this.timeout = setTimeout(() => this.search(), 300);
        },
        avatarBgColor(user) {
            return avatarColor(user && user.username);
        },
        avatarLetter(user) {
            return avatarInitial(user && user.displayName, user && user.username);
        },
        async fetchPage(skip) {
            const params = new URLSearchParams();
            if (this.peopleQuery.trim()) params.set('q', this.peopleQuery.trim());
            if (skip) params.set('skip', skip);
            return fetchJson(`/api/community/users?${params}`);
        },
        async search() {
            this.loading = true;
            this.error = null;
            try {
                const data = await this.fetchPage(0);
                this.results = data.users || [];
                this.hasMore = !!data.hasMore;
            } catch {
                this.error = this.$t('community.peopleLoadError');
            } finally {
                this.loading = false;
            }
        },
        async loadMore() {
            this.loadingMore = true;
            try {
                const data = await this.fetchPage(this.results.length);
                this.results = this.results.concat(data.users || []);
                this.hasMore = !!data.hasMore;
            } catch {
                this.error = this.$t('community.peopleLoadError');
            } finally {
                this.loadingMore = false;
            }
        },
    },
};
</script>
