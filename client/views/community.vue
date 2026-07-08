<style lang="scss">
@import "../css/_community";
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
                {{ $t('community.tabDiscover') }}
            </button>
            <button
                class="lpCommunityTab"
                :class="{ active: activeTab === 'feed' }"
                :aria-disabled="!canSeeFeed || undefined"
                :title="!canSeeFeed ? 'Follow someone to see their activity' : ''"
                data-tab="feed"
                @click="canSeeFeed && setTab('feed')"
            >
                {{ $t('community.tabFeed') }}
            </button>
            <button
                class="lpCommunityTab"
                :class="{ active: activeTab === 'people' }"
                @click="setTab('people')"
            >
                {{ $t('community.tabPeople') }}
            </button>
            <button
                v-if="isModerator"
                class="lpCommunityTab"
                :class="{ active: activeTab === 'moderation' }"
                @click="setTab('moderation')"
            >
                {{ $t('community.tabModeration') }}
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
                    {{ $t('community.sortRecent') }}
                </button>
                <button
                    class="lpCommunitySortBtn"
                    :class="{ active: discoverSort === 'popular' }"
                    data-sort="popular"
                    @click="changeDiscoverSort('popular')"
                >
                    {{ $t('community.sortPopular') }}
                </button>
            </div>

            <div class="lpCommunitySearch">
                <input
                    v-model="searchQuery"
                    type="text"
                    class="lpCommunitySearchInput"
                    :placeholder="$t('community.searchListsPlaceholder')"
                    @input="onSearchInput"
                />
            </div>

            <div class="lpCommunityFilters">
                <select v-model="filterSeason" class="lpCommunityFilterSelect" aria-label="Filter by season" @change="applyDiscoverFilters">
                    <option value="">{{ $t('community.filterSeasonAny') }}</option>
                    <option v-for="season in seasonOptions" :key="season.value" :value="season.value">{{ season.label }}</option>
                </select>
                <select v-model="filterType" class="lpCommunityFilterSelect" aria-label="Filter by list type" @change="applyDiscoverFilters">
                    <option value="">{{ $t('community.filterTypeAny') }}</option>
                    <option v-for="listType in listTypeOptions" :key="listType.value" :value="listType.value">{{ listType.label }}</option>
                </select>
                <input
                    v-model="filterMinWeight"
                    type="number"
                    min="0"
                    step="0.1"
                    class="lpCommunityFilterInput"
                    :placeholder="$t('community.filterMinKgPlaceholder')"
                    aria-label="Minimum base weight in kilograms"
                    @input="onFilterInput"
                />
                <input
                    v-model="filterMaxWeight"
                    type="number"
                    min="0"
                    step="0.1"
                    class="lpCommunityFilterInput"
                    :placeholder="$t('community.filterMaxKgPlaceholder')"
                    aria-label="Maximum base weight in kilograms"
                    @input="onFilterInput"
                />
                <button v-if="filtersActive" class="lpCommunityFilterReset" @click="resetDiscoverFilters">{{ $t('community.filterReset') }}</button>
            </div>

            <p v-if="discoverLoading && discoverLists.length === 0" class="lpCommunityEmpty">{{ $t('community.loading') }}</p>
            <p v-else-if="discoverError" class="lpCommunityEmpty">{{ discoverError }}</p>
            <p v-else-if="discoverLists.length === 0" class="lpCommunityEmpty">
                {{ $t('community.emptyDiscoverNone') }}
            </p>
            <template v-else>
                <div class="lpCommunityDiscoverLayout">
                    <section class="lpCommunityResults">
                        <div v-if="featuredLists.length > 0" class="lpCommunityFeatured">
                            <div class="lpCommunityFeaturedLabel">{{ $t('community.featuredLabel') }}</div>
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
                                    <span v-if="list.authorTier === 'guide'" class="lpCommunityBadge">Wayfarer</span>
                                    <span v-else-if="list.authorTier === 'trail'" class="lpCommunityBadge">Kin</span>
                                </div>
                                <div class="lpCommunityCardMeta">
                                    <span class="lpCommunityCardMetaItem">{{ formatWeight(list.totalBaseWeight) }} base</span>
                                    <span class="lpCommunityCardMetaItem">{{ list.totalQty }} items</span>
                                    <span v-if="list.viewCount" class="lpCommunityCardMetaItem">{{ list.viewCount }} views</span>
                                    <span v-if="list.copyCount" class="lpCommunityCardMetaItem">{{ list.copyCount }} copies</span>
                                </div>
                                <div v-if="listTags(list).length" class="lpCommunityTags">
                                    <span v-for="tag in listTags(list)" :key="list.externalId + '-f-' + tag" class="lpCommunityTag">{{ formatTag(tag) }}</span>
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
                                <span v-if="list.authorTier === 'guide'" class="lpCommunityBadge">Wayfarer</span>
                                <span v-else-if="list.authorTier === 'trail'" class="lpCommunityBadge">Kin</span>
                            </div>
                            <div class="lpCommunityCardMeta">
                                <span v-if="list.totalBaseWeight" class="lpCommunityCardMetaItem">{{ formatWeight(list.totalBaseWeight) }} base</span>
                                <span v-if="list.totalQty" class="lpCommunityCardMetaItem">{{ list.totalQty }} items</span>
                                <span v-if="list.viewCount" class="lpCommunityCardMetaItem">{{ list.viewCount }} views</span>
                                <span v-if="list.copyCount" class="lpCommunityCardMetaItem">{{ list.copyCount }} copies</span>
                                <span v-if="list.updatedAt && new Date(list.updatedAt) > new Date('2020-01-01')" class="lpCommunityCardMetaItem">{{ timeAgo(list.updatedAt) }}</span>
                            </div>
                            <div v-if="listTags(list).length" class="lpCommunityTags">
                                <span v-for="tag in listTags(list)" :key="list.externalId + '-' + tag" class="lpCommunityTag">{{ formatTag(tag) }}</span>
                            </div>
                            <div v-if="$store.state.loggedIn" @click.stop>
                                <report-button target-type="list" :target-id="list.externalId" />
                            </div>
                        </div>
                        <button v-if="discoverHasMore" class="lpCommunityLoadMore" :disabled="discoverLoading" @click="discoverLoadMore">
                            {{ discoverLoading ? $t('community.loading') : $t('community.feedLoadMore') }}
                        </button>
                    </section>
                    <aside class="lpCommunityPopular" aria-label="Popular packs">
                        <div class="lpCommunityPopularTitle">{{ $t('community.popularPacksTitle') }}</div>
                        <p v-if="popularLoading" class="lpCommunityPopularEmpty">{{ $t('community.loading') }}</p>
                        <router-link
                            v-for="list in popularLists"
                            :key="'popular-' + list.externalId"
                            :to="`/p/${list.externalId}`"
                            class="lpCommunityPopularItem"
                        >
                            <span class="lpCommunityPopularName">{{ list.name }}</span>
                            <span class="lpCommunityPopularMeta">{{ list.viewCount }} views · {{ formatWeight(list.totalBaseWeight) }} base</span>
                        </router-link>
                    </aside>
                </div>
            </template>
        </div>

        <!-- People tab -->
        <community-people v-if="activeTab === 'people'" />

        <!-- My Feed tab -->
        <div v-if="activeTab === 'feed'">
            <p v-if="feedLoading && feedEvents.length === 0" class="lpCommunityEmpty">{{ $t('community.loading') }}</p>
            <p v-else-if="feedError" class="lpCommunityEmpty">{{ feedError }}</p>
            <p v-else-if="feedEvents.length === 0" class="lpCommunityEmpty">
                {{ $t('community.emptyFeedNone') }}
            </p>
            <template v-else>
                <article v-for="event in feedEvents" :key="String(event._id)" class="lpCommunityEvent">
                    <div class="lpCommunityEventAvatar">
                        {{ event.author.charAt(0).toUpperCase() }}
                    </div>
                    <div class="lpCommunityEventBody">
                        <div class="lpCommunityEventLine">
                            <router-link :to="`/u/${event.author}`">{{ event.author }}</router-link>
                            <span v-if="event.authorTier === 'guide'" class="lpCommunityBadge">Wayfarer</span>
                            <span v-else-if="event.authorTier === 'trail'" class="lpCommunityBadge">Kin</span>
                            <span> {{ eventLabel(event.type) }}</span>
                        </div>
                        <div v-if="event.listName" class="lpCommunityEventList">
                            {{ event.listName }}
                        </div>
                        <div v-else-if="event.listDeleted" class="lpCommunityEventList lpCommunityEventListDeleted">
                            {{ $t('community.listNoLongerAvailable') }}
                        </div>
                        <div class="lpCommunityEventTime">{{ timeAgo(event.createdAt) }}</div>
                    </div>
                </article>
                <button v-if="feedHasMore" class="lpCommunityLoadMore" :disabled="feedLoading" @click="feedLoadMore">
                    {{ feedLoading ? $t('community.loading') : $t('community.feedLoadMore') }}
                </button>
            </template>
        </div>

        <!-- Moderation tab -->
        <community-moderation
            v-if="activeTab === 'moderation' && isModerator"
            @feature-list="featureList"
        />
    </main>
</template>

<script>
import { useDiscover } from '../composables/useDiscover';
import { useFeed } from '../composables/useFeed';
import { useTheme } from '../composables/useTheme';
import { fetchJson } from '../utils/utils.js';
import CommunityModeration from '../components/community-moderation.vue';
import CommunityPeople from '../components/community-people.vue';
import reportButton from '../components/report-button.vue';

export default {
    name: 'CommunityView',
    components: { CommunityModeration, CommunityPeople, reportButton },
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
            setFilters: setDiscoverFilters,
            load: discoverLoad,
            loadMore: discoverLoadMore,
        } = useDiscover();

        const {
            lists: popularLists,
            loading: popularLoading,
            load: popularLoad,
        } = useDiscover({ sort: 'popular', limit: 5 });

        const {
            events: feedEvents,
            loading: feedLoading,
            error: feedError,
            hasMore: feedHasMore,
            load: feedLoad,
            loadMore: feedLoadMore,
        } = useFeed();

        discoverLoad();
        popularLoad();

        return {
            discoverLists, discoverLoading, discoverError, discoverHasMore,
            discoverSort, setDiscoverSort, setDiscoverQuery, setDiscoverFilters, discoverLoadMore,
            popularLists, popularLoading,
            feedEvents, feedLoading, feedError, feedHasMore, feedLoad, feedLoadMore,
        };
    },
    data() {
        return {
            activeTab: this.$route.path.endsWith('/feed') ? 'feed' : 'discover',
            searchQuery: '',
            searchTimeout: null,
            filterTimeout: null,
            filterSeason: '',
            filterType: '',
            filterMinWeight: '',
            filterMaxWeight: '',
            isModerator: false,
            seasonOptions: [
                { value: '3-season', label: '3-Season' },
                { value: '4-season', label: '4-Season' },
                { value: 'spring', label: 'Spring' },
                { value: 'summer', label: 'Summer' },
                { value: 'fall', label: 'Fall' },
                { value: 'winter', label: 'Winter' },
            ],
            listTypeOptions: [
                { value: 'day-hike', label: 'Day hike' },
                { value: 'weekend', label: 'Weekend' },
                { value: 'thru-hike', label: 'Thru-hike' },
                { value: 'bikepacking', label: 'Bikepacking' },
            ],
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
        filtersActive() {
            return Boolean(this.filterSeason || this.filterType || this.filterMinWeight || this.filterMaxWeight);
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
        },
        onSearchInput() {
            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(() => {
                this.setDiscoverQuery(this.searchQuery);
            }, 300);
        },
        onFilterInput() {
            clearTimeout(this.filterTimeout);
            this.filterTimeout = setTimeout(this.applyDiscoverFilters, 300);
        },
        applyDiscoverFilters() {
            this.setDiscoverFilters({
                season: this.filterSeason,
                type: this.filterType,
                minWeightKg: this.filterMinWeight,
                maxWeightKg: this.filterMaxWeight,
            });
        },
        resetDiscoverFilters() {
            this.filterSeason = '';
            this.filterType = '';
            this.filterMinWeight = '';
            this.filterMaxWeight = '';
            this.applyDiscoverFilters();
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
        formatWeight(mg) {
            if (!mg) return '';
            const kg = mg / 1000000;
            return kg >= 1 ? `${kg.toFixed(1)} kg` : `${Math.round(mg / 1000)} g`;
        },
        listTags(list) {
            return [
                ...(Array.isArray(list.seasons) ? list.seasons : []),
                ...(Array.isArray(list.listTypes) ? list.listTypes : []),
            ];
        },
        formatTag(value) {
            const label = [...this.seasonOptions, ...this.listTypeOptions].find(option => option.value === value);
            return label ? label.label : value;
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
                this.isModerator = false;
            }
        },
    },
};
</script>
