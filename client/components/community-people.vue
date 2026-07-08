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
            />
        </div>
        <p v-if="loading" class="lpCommunityEmpty">{{ $t('community.loading') }}</p>
        <p v-else-if="error" class="lpCommunityEmpty">{{ error }}</p>
        <p v-else-if="peopleQuery && results.length === 0" class="lpCommunityEmpty">{{ $t('community.peopleNoUsersFound') }}</p>
        <template v-else>
            <router-link
                v-for="user in results"
                :key="user.username"
                :to="`/u/${user.username}`"
                class="lpCommunityCard lpCommunityCardUser"
            >
                <div class="lpCommunityCardName">
                    {{ user.displayName || user.username }}
                    <span v-if="user.tier === 'guide'" class="lpCommunityBadge">Wayfarer</span>
                    <span v-else-if="user.tier === 'trail'" class="lpCommunityBadge">Kin</span>
                </div>
                <div class="lpCommunityCardAuthor">@{{ user.username }}</div>
                <div v-if="user.bio" class="lpCommunityCardMeta">{{ user.bio }}</div>
            </router-link>
        </template>
    </div>
</template>

<script>
import { fetchJson } from '../utils/utils.js';

export default {
    name: 'CommunityPeople',
    data() {
        return {
            peopleQuery: '',
            results: [],
            loading: false,
            error: null,
            timeout: null,
        };
    },
    methods: {
        onInput() {
            clearTimeout(this.timeout);
            this.timeout = setTimeout(() => this.search(), 300);
        },
        async search() {
            if (!this.peopleQuery.trim()) {
                this.results = [];
                return;
            }
            this.loading = true;
            this.error = null;
            try {
                const params = new URLSearchParams({ q: this.peopleQuery.trim() });
                const data = await fetchJson(`/api/community/users?${params}`);
                this.results = data.users || [];
            } catch {
                this.error = this.$t('community.peopleLoadError');
            } finally {
                this.loading = false;
            }
        },
    },
};
</script>
