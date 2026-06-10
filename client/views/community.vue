<style lang="scss">
@import "../css/_globals";

.lpCommunity {
    margin: 0 auto;
    max-width: 720px;
    padding: 32px 20px;
}

.lpCommunityTabs {
    display: flex;
    gap: 0;
    border-bottom: 1px solid $color-border;
    margin-bottom: 24px;
}

.lpCommunityTab {
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    color: $color-text-muted;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    margin-bottom: -1px;
    padding: 8px 18px;
    transition: color $transitionDurationFast;

    &.active {
        border-bottom-color: $color-accent;
        color: $color-text;
    }

    &[aria-disabled="true"] {
        cursor: not-allowed;
        opacity: 0.45;
    }
}

.lpCommunitySort {
    align-items: center;
    display: flex;
    gap: 8px;
    margin-bottom: 16px;
}

.lpCommunitySortBtn {
    background: $color-surface;
    border: 1px solid $color-border;
    border-radius: $radius-sm;
    color: $color-text-muted;
    cursor: pointer;
    font-size: 12px;
    padding: 4px 12px;

    &.active {
        background: $color-accent;
        border-color: $color-accent;
        color: #fff;
    }
}

.lpCommunityEmpty {
    color: $color-text-muted;
    margin-top: 48px;
    text-align: center;
}

.lpCommunityCard {
    background: $color-surface;
    border: 1px solid $color-border;
    border-radius: $radius-md;
    cursor: pointer;
    display: block;
    margin-bottom: 8px;
    padding: 14px 16px;
    text-decoration: none;
    transition: border-color $transitionDurationFast ease;

    &:hover {
        border-color: $color-accent;
    }
}

.lpCommunityCardName {
    color: $color-accent;
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 4px;
}

.lpCommunityCardAuthor {
    color: $color-text-muted;
    font-size: 12px;
    margin-bottom: 6px;

    a {
        color: $color-text;
        text-decoration: none;
        font-weight: 500;

        &:hover { text-decoration: underline; }
    }
}

.lpCommunityBadge {
    background: $color-accent;
    border-radius: 8px;
    color: #fff;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.04em;
    margin-left: 5px;
    padding: 1px 6px;
    text-transform: uppercase;
    vertical-align: middle;
}

.lpCommunityCardMeta {
    color: $color-text-muted;
    display: flex;
    font-size: 11px;
    gap: 14px;
}

.lpBtn {
    background: $color-surface;
    border: 1px solid $color-border;
    border-radius: $radius-sm;
    color: $color-text;
    cursor: pointer;
    font-size: 13px;
    padding: 6px 16px;
    transition: opacity $transitionDurationFast;

    &:hover:not(:disabled) { opacity: 0.8; }
    &:disabled { cursor: not-allowed; opacity: 0.5; }
}

.lpCommunityLoadMore {
    display: block;
    margin: 24px auto 0;
    padding: 8px 24px;
}
</style>

<template>
    <main class="lpCommunity">
        <div class="lpCommunityTabs">
            <button
                class="lpCommunityTab"
                :class="{ active: activeTab === 'discover' }"
                @click="setTab('discover')"
            >
                Discover
            </button>
            <button
                class="lpCommunityTab"
                :class="{ active: activeTab === 'feed' }"
                :aria-disabled="!canSeeFeed ? 'true' : 'false'"
                :title="!canSeeFeed ? 'Follow someone to see their activity' : ''"
                data-tab="feed"
                @click="canSeeFeed && setTab('feed')"
            >
                My Feed
            </button>
        </div>

        <!-- Discover tab -->
        <div v-if="activeTab === 'discover'">
            <div class="lpCommunitySort">
                <button
                    class="lpCommunitySortBtn"
                    :class="{ active: discoverSort === 'recent' }"
                    data-sort="recent"
                    @click="setDiscoverSort('recent')"
                >
                    Recent
                </button>
                <button
                    class="lpCommunitySortBtn"
                    :class="{ active: discoverSort === 'popular' }"
                    data-sort="popular"
                    @click="setDiscoverSort('popular')"
                >
                    Most copied
                </button>
            </div>

            <p v-if="discoverLoading && discoverLists.length === 0">Loading...</p>
            <p v-else-if="discoverError" class="lpCommunityEmpty">{{ discoverError }}</p>
            <p v-else-if="discoverLists.length === 0" class="lpCommunityEmpty">
                No public lists yet. Be the first to share one.
            </p>
            <template v-else>
                <router-link
                    v-for="list in discoverLists"
                    :key="list.externalId"
                    :to="`/p/${list.externalId}`"
                    class="lpCommunityCard"
                >
                    <div class="lpCommunityCardName">{{ list.name }}</div>
                    <div class="lpCommunityCardAuthor">
                        by <router-link :to="`/u/${list.author}`" @click.stop>{{ list.author }}</router-link>
                        <span v-if="list.authorTier === 'guide'" class="lpCommunityBadge">Guide</span>
                        <span v-else-if="list.authorTier === 'trail'" class="lpCommunityBadge">Trail</span>
                    </div>
                    <div class="lpCommunityCardMeta">
                        <span v-if="list.totalBaseWeight">⚖ {{ formatWeight(list.totalBaseWeight) }}</span>
                        <span v-if="list.totalQty">📦 {{ list.totalQty }} items</span>
                        <span v-if="list.copyCount">📋 {{ list.copyCount }} copies</span>
                        <span>{{ timeAgo(list.updatedAt) }}</span>
                    </div>
                </router-link>
                <button v-if="discoverHasMore" class="lpBtn lpCommunityLoadMore" :disabled="discoverLoading" @click="discoverLoadMore">
                    {{ discoverLoading ? 'Loading...' : 'Load more' }}
                </button>
            </template>
        </div>

        <!-- My Feed tab -->
        <div v-if="activeTab === 'feed'">
            <p v-if="feedLoading && feedEvents.length === 0">Loading...</p>
            <p v-else-if="feedError" class="lpCommunityEmpty">{{ feedError }}</p>
            <p v-else-if="feedEvents.length === 0" class="lpCommunityEmpty">
                Nothing here yet. Follow some users to see their list activity.
            </p>
            <template v-else>
                <article v-for="event in feedEvents" :key="String(event._id)" class="lpFeedEvent" style="align-items:flex-start;border-bottom:1px solid var(--color-border);display:flex;gap:12px;padding:16px 0;">
                    <div style="background:var(--color-surface);border:1px solid var(--color-border);border-radius:50%;flex-shrink:0;font-size:18px;height:36px;line-height:36px;text-align:center;width:36px;">
                        {{ event.author.charAt(0).toUpperCase() }}
                    </div>
                    <div style="flex:1;">
                        <div>
                            <router-link :to="`/u/${event.author}`"><strong>{{ event.author }}</strong></router-link>
                            <span v-if="event.authorTier === 'guide'" class="lpCommunityBadge">Guide</span>
                            <span v-else-if="event.authorTier === 'trail'" class="lpCommunityBadge">Trail</span>
                            <span> {{ eventLabel(event.type) }}</span>
                        </div>
                        <div v-if="event.listName" style="background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-sm);font-size:13px;margin-top:8px;padding:10px 12px;">
                            {{ event.listName }}
                        </div>
                        <div v-else-if="event.listDeleted" style="color:var(--color-text-muted);font-style:italic;margin-top:8px;">
                            List no longer available
                        </div>
                        <div style="color:var(--color-text-muted);font-size:12px;margin-top:4px;">{{ timeAgo(event.createdAt) }}</div>
                    </div>
                </article>
                <button v-if="feedHasMore" class="lpBtn lpCommunityLoadMore" :disabled="feedLoading" @click="feedLoadMore">
                    {{ feedLoading ? 'Loading...' : 'Load more' }}
                </button>
            </template>
        </div>
    </main>
</template>

<script>
import { useRoute } from 'vue-router';
import { useDiscover } from '../composables/useDiscover';
import { useFeed } from '../composables/useFeed';

export default {
    name: 'CommunityView',
    setup() {
        const route = useRoute();
        const {
            lists: discoverLists,
            loading: discoverLoading,
            error: discoverError,
            hasMore: discoverHasMore,
            sort: discoverSort,
            setSort: setDiscoverSort,
            load: discoverLoad,
            loadMore: discoverLoadMore,
        } = useDiscover();

        const {
            events: feedEvents,
            loading: feedLoading,
            error: feedError,
            hasMore: feedHasMore,
            load: feedLoad,
            loadMore: feedLoadMore,
        } = useFeed();

        discoverLoad();

        return {
            discoverLists, discoverLoading, discoverError, discoverHasMore,
            discoverSort, setDiscoverSort, discoverLoadMore,
            feedEvents, feedLoading, feedError, feedHasMore, feedLoad, feedLoadMore,
        };
    },
    data() {
        return {
            activeTab: this.$route.path.endsWith('/feed') ? 'feed' : 'discover',
            canSeeFeed: false,
        };
    },
    created() {
        // Check if user is logged in to enable the Feed tab
        fetch('/api/community/feed')
            .then(r => {
                if (r.ok || r.status === 200) {
                    this.canSeeFeed = true;
                    if (this.activeTab === 'feed') this.feedLoad();
                }
            })
            .catch(() => {
                // Not logged in or error — Feed tab stays disabled
            });
    },
    methods: {
        setTab(tab) {
            this.activeTab = tab;
            const path = tab === 'feed' ? '/community/feed' : '/community';
            if (this.$route.path !== path) this.$router.replace(path);
            if (tab === 'feed' && this.feedEvents.length === 0) this.feedLoad();
        },
        eventLabel(type) {
            if (type === 'list.published') return 'published a new list';
            if (type === 'list.made-public') return 'made a list public';
            if (type === 'list.updated') return 'updated a list';
            return 'updated their gear';
        },
        formatWeight(grams) {
            if (!grams) return '';
            const kg = grams / 1000;
            return kg >= 1 ? `${kg.toFixed(1)} kg` : `${grams} g`;
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
