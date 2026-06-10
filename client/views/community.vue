<style lang="scss">
@import "../css/_globals";

.lpCommunity {
    margin: 0 auto;
    max-width: 680px;
    padding: 24px 20px 48px;
}

/* ── Tabs ── */

.lpCommunityTabs {
    border-bottom: 1px solid $color-border;
    display: flex;
    margin-bottom: 20px;
}

.lpCommunityTab {
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    color: $color-text-muted;
    cursor: pointer;
    font-size: $fontSize-base;
    font-weight: $fontWeight-medium;
    margin-bottom: -1px;
    padding: 10px 16px;
    transition: color $transitionDurationFast ease, border-color $transitionDurationFast ease;

    &.active {
        border-bottom-color: $color-accent;
        color: $color-text;
        font-weight: $fontWeight-bold;
    }

    &[aria-disabled] {
        cursor: not-allowed;
        opacity: 0.4;
    }
}

/* ── Sort toolbar ── */

.lpCommunitySort {
    align-items: center;
    display: flex;
    gap: 6px;
    margin-bottom: 16px;
}

.lpCommunitySortLabel {
    color: $color-text-muted;
    font-size: $fontSize-xs;
    font-weight: $fontWeight-bold;
    letter-spacing: $letterSpacing-caps;
    margin-right: 4px;
    text-transform: uppercase;
}

.lpCommunitySortBtn {
    background: $color-control-muted;
    border: 1px solid transparent;
    border-radius: $radius-sm;
    color: $color-text-muted;
    cursor: pointer;
    font-size: $fontSize-sm;
    font-weight: $fontWeight-medium;
    height: $control-height-sm;
    padding: 0 12px;
    transition: background $transitionDurationFast ease, color $transitionDurationFast ease, border-color $transitionDurationFast ease;

    &:hover {
        color: $color-text;
    }

    &.active {
        background: $color-surface;
        border-color: $color-border;
        color: $color-text;
        font-weight: $fontWeight-bold;
    }
}

/* ── List cards ── */

.lpCommunityCard {
    background: $color-surface;
    border: 1px solid $color-border;
    border-radius: $radius-md;
    display: block;
    margin-bottom: 6px;
    padding: 14px 16px;
    text-decoration: none;
    transition: border-color $transitionDurationFast ease, box-shadow $transitionDurationFast ease;

    &:hover {
        border-color: $color-accent;
        box-shadow: $shadow-soft;
    }
}

.lpCommunityCardName {
    color: $color-accent;
    font-size: $fontSize-base;
    font-weight: $fontWeight-bold;
    margin-bottom: 4px;
}

.lpCommunityCardAuthor {
    color: $color-text-muted;
    font-size: $fontSize-sm;
    margin-bottom: 8px;

    a {
        color: $color-text;
        font-weight: $fontWeight-medium;
        text-decoration: none;

        &:hover { text-decoration: underline; }
    }
}

.lpCommunityBadge {
    background: rgba(var(--color-accent-rgb), 0.14);
    border-radius: 4px;
    color: $color-accent;
    font-size: $fontSize-xs;
    font-weight: $fontWeight-bold;
    letter-spacing: $letterSpacing-caps;
    margin-left: 5px;
    padding: 1px 5px;
    text-transform: uppercase;
    vertical-align: middle;
}

.lpCommunityCardMeta {
    color: $color-text-muted;
    display: flex;
    flex-wrap: wrap;
    font-size: $fontSize-xs;
    gap: 12px;
}

.lpCommunityCardMetaItem {
    align-items: center;
    display: flex;
    gap: 4px;
}

/* ── Feed events ── */

.lpCommunityEvent {
    align-items: flex-start;
    border-bottom: 1px solid $color-border;
    display: flex;
    gap: 12px;
    padding: 14px 0;
}

.lpCommunityEventAvatar {
    align-items: center;
    background: $color-control-muted;
    border: 1px solid $color-border;
    border-radius: 50%;
    color: $color-text-muted;
    display: flex;
    flex-shrink: 0;
    font-size: $fontSize-md;
    font-weight: $fontWeight-bold;
    height: 36px;
    justify-content: center;
    width: 36px;
}

.lpCommunityEventBody {
    flex: 1;
    min-width: 0;
}

.lpCommunityEventLine {
    font-size: $fontSize-base;
    line-height: 1.4;

    a {
        color: $color-text;
        font-weight: $fontWeight-bold;
        text-decoration: none;

        &:hover { text-decoration: underline; }
    }

    span {
        color: $color-text-muted;
    }
}

.lpCommunityEventList {
    background: $color-control-muted;
    border-radius: $radius-sm;
    color: $color-text;
    font-size: $fontSize-sm;
    font-weight: $fontWeight-medium;
    margin-top: 6px;
    padding: 8px 12px;
}

.lpCommunityEventTime {
    color: $color-text-muted;
    font-size: $fontSize-xs;
    margin-top: 4px;
}

/* ── Nav ── */

.lpCommunityNav {
    margin-bottom: 20px;

    a {
        color: $color-text-muted;
        font-size: $fontSize-sm;
        text-decoration: none;

        &:hover { color: $color-text; }
    }
}

.lpCommunityHeader {
    align-items: baseline;
    display: flex;
    justify-content: space-between;
    margin-bottom: 20px;

    h1 {
        font-size: $fontSize-md;
        font-weight: $fontWeight-bold;
        margin: 0;
    }
}

/* ── Empty / Loading states ── */

.lpCommunityEmpty {
    color: $color-text-muted;
    font-size: $fontSize-base;
    margin-top: 48px;
    text-align: center;
}

/* ── Load more ── */

.lpCommunityLoadMore {
    background: $color-surface;
    border: 1px solid $color-border;
    border-radius: $radius-sm;
    color: $color-text-muted;
    cursor: pointer;
    display: block;
    font-size: $fontSize-sm;
    font-weight: $fontWeight-medium;
    height: $control-height-md;
    margin: 20px auto 0;
    padding: 0 24px;
    transition: border-color $transitionDurationFast ease, color $transitionDurationFast ease;

    &:hover:not(:disabled) {
        border-color: $color-accent;
        color: $color-text;
    }

    &:disabled {
        cursor: not-allowed;
        opacity: 0.5;
    }
}
</style>

<template>
    <main class="lpCommunity">
        <nav class="lpCommunityNav">
            <router-link to="/">← Back to LighterPack+</router-link>
        </nav>

        <div class="lpCommunityHeader">
            <h1>Community</h1>
        </div>

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
                :aria-disabled="!canSeeFeed || undefined"
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

            <p v-if="discoverLoading && discoverLists.length === 0" class="lpCommunityEmpty">Loading…</p>
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
                        <span v-if="list.totalBaseWeight" class="lpCommunityCardMetaItem">{{ formatWeight(list.totalBaseWeight) }} base</span>
                        <span v-if="list.totalQty" class="lpCommunityCardMetaItem">{{ list.totalQty }} items</span>
                        <span v-if="list.copyCount" class="lpCommunityCardMetaItem">{{ list.copyCount }} copies</span>
                        <span class="lpCommunityCardMetaItem">{{ timeAgo(list.updatedAt) }}</span>
                    </div>
                </router-link>
                <button v-if="discoverHasMore" class="lpCommunityLoadMore" :disabled="discoverLoading" @click="discoverLoadMore">
                    {{ discoverLoading ? 'Loading…' : 'Load more' }}
                </button>
            </template>
        </div>

        <!-- My Feed tab -->
        <div v-if="activeTab === 'feed'">
            <p v-if="feedLoading && feedEvents.length === 0" class="lpCommunityEmpty">Loading…</p>
            <p v-else-if="feedError" class="lpCommunityEmpty">{{ feedError }}</p>
            <p v-else-if="feedEvents.length === 0" class="lpCommunityEmpty">
                Nothing here yet. Follow some users to see their activity.
            </p>
            <template v-else>
                <article v-for="event in feedEvents" :key="String(event._id)" class="lpCommunityEvent">
                    <div class="lpCommunityEventAvatar">
                        {{ event.author.charAt(0).toUpperCase() }}
                    </div>
                    <div class="lpCommunityEventBody">
                        <div class="lpCommunityEventLine">
                            <router-link :to="`/u/${event.author}`">{{ event.author }}</router-link>
                            <span v-if="event.authorTier === 'guide'" class="lpCommunityBadge">Guide</span>
                            <span v-else-if="event.authorTier === 'trail'" class="lpCommunityBadge">Trail</span>
                            <span> {{ eventLabel(event.type) }}</span>
                        </div>
                        <div v-if="event.listName" class="lpCommunityEventList">
                            {{ event.listName }}
                        </div>
                        <div v-else-if="event.listDeleted" class="lpCommunityEventList" style="font-style:italic;color:var(--color-text-muted)">
                            List no longer available
                        </div>
                        <div class="lpCommunityEventTime">{{ timeAgo(event.createdAt) }}</div>
                    </div>
                </article>
                <button v-if="feedHasMore" class="lpCommunityLoadMore" :disabled="feedLoading" @click="feedLoadMore">
                    {{ feedLoading ? 'Loading…' : 'Load more' }}
                </button>
            </template>
        </div>
    </main>
</template>

<script>
import { useRoute } from 'vue-router';
import { useDiscover } from '../composables/useDiscover';
import { useFeed } from '../composables/useFeed';
import { useTheme } from '../composables/useTheme';

export default {
    name: 'CommunityView',
    setup() {
        useTheme();
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
        };
    },
    computed: {
        canSeeFeed() {
            return Boolean(this.$store.state.loggedIn);
        },
    },
    created() {
        if (this.canSeeFeed && this.activeTab === 'feed') this.feedLoad();
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
