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

.lpCommunityEventListDeleted {
    color: $color-text-muted;
    font-style: italic;
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

/* ── User cards ── */

.lpCommunityCardUser {
    .lpCommunityCardAuthor {
        color: $color-text-muted;
        font-size: $fontSize-sm;
        margin-top: 2px;
    }
}

/* ── Search ── */

.lpCommunitySearch {
    margin-bottom: 16px;
}

.lpCommunitySearchInput {
    background: $color-surface;
    border: 1px solid $color-border;
    border-radius: $radius-sm;
    color: $color-text;
    font-size: $fontSize-sm;
    padding: 8px 12px;
    width: 100%;

    &:focus {
        border-color: $color-accent;
        outline: none;
    }

    &::placeholder {
        color: $color-text-muted;
    }
}

/* ── Featured section ── */

.lpCommunityFeatured {
    margin-bottom: 24px;
}

.lpCommunityFeaturedLabel {
    color: $color-text-muted;
    font-size: $fontSize-xs;
    font-weight: $fontWeight-bold;
    letter-spacing: $letterSpacing-caps;
    margin-bottom: 8px;
    text-transform: uppercase;
}

.lpCommunityCardFeatured {
    border-color: $color-accent;
    position: relative;

    &::before {
        color: $color-accent;
        content: '★';
        font-size: 10px;
        position: absolute;
        right: 12px;
        top: 12px;
    }
}

/* ── Moderation panel ── */

.lpModerationReport {
    border-bottom: 1px solid $color-border;
    padding: 14px 0;

    &:last-child { border-bottom: none; }
}

.lpModerationReportMeta {
    align-items: center;
    color: $color-text-muted;
    display: flex;
    flex-wrap: wrap;
    font-size: $fontSize-xs;
    gap: 8px;
    margin-bottom: 6px;
}

.lpModerationReportTarget {
    font-size: $fontSize-sm;
    margin-bottom: 8px;

    a {
        color: $color-accent;
        text-decoration: none;
        word-break: break-all;

        &:hover { text-decoration: underline; }
    }
}

.lpModerationReportActions {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
}

</style>

<template>
    <main class="lpCommunity">
        <nav class="lpCommunityNav">
            <router-link to="/">← Back to ZenPak</router-link>
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
            <button
                class="lpCommunityTab"
                :class="{ active: activeTab === 'people' }"
                @click="setTab('people')"
            >
                People
            </button>
            <button
                v-if="isModerator"
                class="lpCommunityTab"
                :class="{ active: activeTab === 'moderation' }"
                @click="setTab('moderation')"
            >
                Moderation
            </button>
        </div>

        <!-- Discover tab -->
        <div v-if="activeTab === 'discover'">
            <div class="lpCommunitySort">
                        <button
                    class="lpCommunitySortBtn"
                    :class="{ active: discoverSort === 'recent' }"
                    data-sort="recent"
                    @click="changeDiscoverSort('recent')"
                >
                    Recent
                </button>
                <button
                    class="lpCommunitySortBtn"
                    :class="{ active: discoverSort === 'popular' }"
                    data-sort="popular"
                    @click="changeDiscoverSort('popular')"
                >
                    Most copied
                </button>
            </div>

            <div class="lpCommunitySearch">
                <input
                    v-model="searchQuery"
                    type="text"
                    class="lpCommunitySearchInput"
                    placeholder="Search lists…"
                    @input="onSearchInput"
                />
            </div>

            <p v-if="discoverLoading && discoverLists.length === 0" class="lpCommunityEmpty">Loading…</p>
            <p v-else-if="discoverError" class="lpCommunityEmpty">{{ discoverError }}</p>
            <p v-else-if="discoverLists.length === 0" class="lpCommunityEmpty">
                No public lists yet. Be the first to share one.
            </p>
            <template v-else>
                <div v-if="featuredLists.length > 0" class="lpCommunityFeatured">
                    <div class="lpCommunityFeaturedLabel">Featured</div>
                    <div
                        v-for="list in featuredLists"
                        :key="'f-' + list.externalId"
                        class="lpCommunityCard lpCommunityCardFeatured"
                        style="cursor:pointer"
                        @click="$router.push(`/p/${list.externalId}`)"
                    >
                        <div class="lpCommunityCardName">{{ list.name }}</div>
                        <div class="lpCommunityCardAuthor">
                            by <router-link :to="`/u/${list.author}`" @click.stop>{{ list.author }}</router-link>
                            <span v-if="list.authorTier === 'guide'" class="lpCommunityBadge">Guide</span>
                            <span v-else-if="list.authorTier === 'trail'" class="lpCommunityBadge">Trail</span>
                        </div>
                        <div class="lpCommunityCardMeta">
                            <span class="lpCommunityCardMetaItem">{{ list.totalBaseWeight.toFixed(2) }} kg base</span>
                            <span class="lpCommunityCardMetaItem">{{ list.totalQty }} items</span>
                            <span class="lpCommunityCardMetaItem">{{ list.copyCount }} copies</span>
                        </div>
                    </div>
                </div>
                <div
                    v-for="list in nonFeaturedLists"
                    :key="list.externalId"
                    class="lpCommunityCard"
                    style="cursor:pointer"
                    @click="$router.push(`/p/${list.externalId}`)"
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
                        <span v-if="list.updatedAt && new Date(list.updatedAt) > new Date('2020-01-01')" class="lpCommunityCardMetaItem">{{ timeAgo(list.updatedAt) }}</span>
                    </div>
                    <div v-if="$store.state.loggedIn" @click.stop>
                        <report-button target-type="list" :target-id="list.externalId" />
                    </div>
                </div>
                <button v-if="discoverHasMore" class="lpCommunityLoadMore" :disabled="discoverLoading" @click="discoverLoadMore">
                    {{ discoverLoading ? 'Loading…' : 'Load more' }}
                </button>
            </template>
        </div>

        <!-- People tab -->
        <div v-if="activeTab === 'people'">
            <div class="lpCommunitySearch">
                <input
                    v-model="peopleQuery"
                    type="text"
                    class="lpCommunitySearchInput"
                    placeholder="Search users…"
                    @input="onPeopleInput"
                    autofocus
                />
            </div>
            <p v-if="peopleLoading" class="lpCommunityEmpty">Loading…</p>
            <p v-else-if="peopleError" class="lpCommunityEmpty">{{ peopleError }}</p>
            <p v-else-if="peopleQuery && peopleResults.length === 0" class="lpCommunityEmpty">No users found.</p>
            <template v-else>
                <router-link
                    v-for="user in peopleResults"
                    :key="user.username"
                    :to="`/u/${user.username}`"
                    class="lpCommunityCard lpCommunityCardUser"
                >
                    <div class="lpCommunityCardName">
                        {{ user.displayName || user.username }}
                        <span v-if="user.tier === 'guide'" class="lpCommunityBadge">Guide</span>
                        <span v-else-if="user.tier === 'trail'" class="lpCommunityBadge">Trail</span>
                    </div>
                    <div class="lpCommunityCardAuthor">@{{ user.username }}</div>
                    <div v-if="user.bio" class="lpCommunityCardMeta">{{ user.bio }}</div>
                </router-link>
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
                        <div v-else-if="event.listDeleted" class="lpCommunityEventList lpCommunityEventListDeleted">
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

        <!-- Moderation tab -->
        <div v-if="activeTab === 'moderation' && isModerator">
            <h2 style="font-size:14px;font-weight:700;margin-bottom:16px">Reports ({{ reports.length }} pending)</h2>
            <p v-if="reportsLoading" class="lpCommunityEmpty">Loading…</p>
            <p v-else-if="reports.length === 0" class="lpCommunityEmpty">No pending reports.</p>
            <template v-else>
                <div v-for="r in reports" :key="String(r._id)" class="lpModerationReport">
                    <div class="lpModerationReportMeta">
                        <span class="lpCommunityBadge">{{ r.targetType }}</span>
                        <span>{{ r.reason }}</span>
                        <span>by {{ r.reporterUsername }}</span>
                        <span>{{ timeAgo(r.createdAt) }}</span>
                    </div>
                    <div class="lpModerationReportTarget">
                        <a :href="r.targetType === 'list' ? `/p/${r.targetId}` : `/u/${r.targetId}`" target="_blank" class="lpHref">{{ r.targetId }}</a>
                    </div>
                    <div class="lpModerationReportActions">
                        <button class="lpButton lpSmall" @click="resolveReport(r, 'resolved')">✓ Resolve</button>
                        <button class="lpButton lpSmall" @click="resolveReport(r, 'dismissed')">✕ Dismiss</button>
                        <button v-if="r.targetType === 'list'" class="lpButton lpSmall" @click="featureList(r.targetId)">★ Feature</button>
                        <button v-if="r.targetType === 'list'" class="lpButton lpSmall lpButtonDanger" @click="unpublishList(r)">Unpublish</button>
                        <button class="lpButton lpSmall lpButtonDanger" @click="banUser(r)">Ban</button>
                    </div>
                </div>
            </template>
        </div>
    </main>
</template>

<script>
import { useDiscover } from '../composables/useDiscover';
import { useFeed } from '../composables/useFeed';
import { useTheme } from '../composables/useTheme';
import { fetchJson } from '../utils/utils.js';
import reportButton from '../components/report-button.vue';

export default {
    name: 'CommunityView',
    components: { reportButton },
    setup() {
        useTheme();
        const {
            lists: discoverLists,
            loading: discoverLoading,
            error: discoverError,
            hasMore: discoverHasMore,
            sort: discoverSort,
            setSort: setDiscoverSort,
            setQuery: setDiscoverQuery,
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
            discoverSort, setDiscoverSort, setDiscoverQuery, discoverLoadMore,
            feedEvents, feedLoading, feedError, feedHasMore, feedLoad, feedLoadMore,
        };
    },
    data() {
        return {
            activeTab: this.$route.path.endsWith('/feed') ? 'feed' : 'discover',
            searchQuery: '',
            searchTimeout: null,
            peopleQuery: '',
            peopleResults: [],
            peopleLoading: false,
            peopleError: null,
            peopleTimeout: null,
            reports: [],
            reportsLoading: false,
            isModerator: false,
        };
    },
    computed: {
        canSeeFeed() {
            return Boolean(this.$store.state.loggedIn);
        },
        featuredLists() {
            return this.discoverLists.filter(l => l.featured);
        },
        nonFeaturedLists() {
            return this.discoverLists.filter(l => !l.featured);
        },
    },
    created() {
        if (this.canSeeFeed && this.activeTab === 'feed') this.feedLoad();
        if (this.canSeeFeed) this.fetchModeratorFlag();
    },
    methods: {
        setTab(tab) {
            this.activeTab = tab;
            const path = tab === 'feed' ? '/community/feed' : '/community';
            if (this.$route.path !== path) this.$router.replace(path);
            if (tab === 'feed' && this.feedEvents.length === 0) this.feedLoad();
            if (tab === 'moderation' && this.reports.length === 0) this.loadReports();
        },
        onPeopleInput() {
            clearTimeout(this.peopleTimeout);
            this.peopleTimeout = setTimeout(() => this.searchPeople(), 300);
        },
        async searchPeople() {
            if (!this.peopleQuery.trim()) {
                this.peopleResults = [];
                return;
            }
            this.peopleLoading = true;
            this.peopleError = null;
            try {
                const params = new URLSearchParams({ q: this.peopleQuery.trim() });
                const data = await fetchJson(`/api/community/users?${params}`);
                this.peopleResults = data.users || [];
            } catch {
                this.peopleError = 'Could not load results.';
            } finally {
                this.peopleLoading = false;
            }
        },
        onSearchInput() {
            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(() => {
                this.setDiscoverQuery(this.searchQuery);
            }, 300);
        },
        changeDiscoverSort(value) {
            this.searchQuery = '';
            this.setDiscoverSort(value);
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
        async featureList(externalId) {
            try {
                const data = await fetchJson(`/api/reports/feature/${externalId}`, { method: 'POST' });
                const list = this.discoverLists.find(l => l.externalId === externalId);
                if (list) list.featured = data.featured;
            } catch { alert('Failed.'); }
        },
        async fetchModeratorFlag() {
            try {
                const data = await fetchJson('/api/auth/me');
                this.isModerator = Boolean(data.isModerator);
            } catch {
                this.moderatorFlag = false;
            }
        },
        async loadReports() {
            this.reportsLoading = true;
            try {
                const data = await fetchJson('/api/reports');
                this.reports = data.reports || [];
            } catch {
                this.reports = [];
            } finally {
                this.reportsLoading = false;
            }
        },
        async resolveReport(report, status) {
            try {
                await fetchJson(`/api/reports/${report._id}`, {
                    method: 'PATCH',
                    body: JSON.stringify({ status }),
                });
                this.reports = this.reports.filter(r => String(r._id) !== String(report._id));
            } catch {}
        },
        async banUser(report) {
            const username = report.targetType === 'user' ? report.targetId : prompt('Username to ban?');
            if (!username || !confirm(`Ban "${username}"?`)) return;
            try {
                await fetchJson(`/api/reports/ban/${username}`, { method: 'POST' });
                await this.resolveReport(report, 'resolved');
            } catch { alert('Failed.'); }
        },
        async unpublishList(report) {
            if (!confirm(`Unpublish "${report.targetId}"?`)) return;
            try {
                await fetchJson(`/api/reports/unpublish/${report.targetId}`, { method: 'POST' });
                await this.resolveReport(report, 'resolved');
            } catch { alert('Failed.'); }
        },
    },
};
</script>
