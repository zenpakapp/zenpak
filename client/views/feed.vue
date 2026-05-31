<style lang="scss">
@import "../css/_globals";

.lpFeed {
    margin: 0 auto;
    max-width: 640px;
    padding: 32px 20px;
}

.lpFeedEmpty {
    color: $color-text-muted;
    margin-top: 48px;
    text-align: center;
}

.lpFeedEvent {
    align-items: flex-start;
    border-bottom: 1px solid $color-border;
    display: flex;
    gap: 12px;
    padding: 16px 0;
}

.lpFeedAvatar {
    background: $color-surface;
    border: 1px solid $color-border;
    border-radius: 50%;
    flex-shrink: 0;
    font-size: 18px;
    height: 36px;
    line-height: 36px;
    text-align: center;
    width: 36px;
}

.lpFeedEventBody {
    flex: 1;
}

.lpFeedEventMeta {
    color: $color-text-muted;
    font-size: 12px;
    margin-top: 4px;
}

.lpFeedListCard {
    background: $color-surface;
    border: 1px solid $color-border;
    border-radius: $radius-sm;
    font-size: 13px;
    margin-top: 8px;
    padding: 10px 12px;
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

    &:hover:not(:disabled) {
        opacity: 0.8;
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
}

.lpFeedLoadMore {
    display: block;
    margin: 24px auto 0;
    padding: 8px 24px;
}

.lpFeedListDeleted {
    color: $color-text-muted;
    font-style: italic;
}
</style>

<template>
    <main class="lpFeed">
        <h1>Activity</h1>

        <p v-if="loading && events.length === 0">Loading...</p>
        <p v-else-if="error" class="lpFeedEmpty">{{ error }}</p>
        <p v-else-if="events.length === 0" class="lpFeedEmpty">
            Nothing here yet. Follow some users to see their list activity.
        </p>

        <template v-else>
            <article v-for="event in events" :key="String(event._id)" class="lpFeedEvent">
                <div class="lpFeedAvatar">{{ event.author.charAt(0).toUpperCase() }}</div>
                <div class="lpFeedEventBody">
                    <div>
                        <router-link :to="`/u/${event.author}`"><strong>{{ event.author }}</strong></router-link>
                        <span> {{ eventLabel(event.type) }}</span>
                    </div>
                    <div v-if="event.listName" class="lpFeedListCard">
                        {{ event.listName }}
                    </div>
                    <div v-else-if="event.listDeleted" class="lpFeedListCard lpFeedListDeleted">
                        List no longer available
                    </div>
                    <div class="lpFeedEventMeta">{{ timeAgo(event.createdAt) }}</div>
                </div>
            </article>

            <button v-if="hasMore" class="lpBtn lpFeedLoadMore" :disabled="loading" @click="loadMore">
                {{ loading ? 'Loading...' : 'Load more' }}
            </button>
        </template>
    </main>
</template>

<script>
import { useFeed } from '../composables/useFeed';

export default {
    name: 'FeedView',
    setup() {
        const { events, loading, error, hasMore, load, loadMore } = useFeed();
        load();
        return { events, loading, error, hasMore, loadMore };
    },
    methods: {
        eventLabel(type) {
            if (type === 'list.published') return 'published a new list';
            if (type === 'list.made-public') return 'made a list public';
            if (type === 'list.updated') return 'updated a list';
            return 'updated their gear';
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
